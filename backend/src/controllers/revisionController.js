const axios = require('axios');
const Question = require('../models/Question');
const RevisionProgress = require('../models/RevisionProgress');
const { computeSM2 } = require('../utils/sm2');
const { getAccessibleMatiereIds } = require('../utils/accessControl');
const { fromMatiere } = require('../utils/breadcrumb');

// URL du micro-service Python (l'automatisation demandée). Configurable via .env.
const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000';

// Appelle le moteur Python ; si indisponible (non démarré, réseau coupé…),
// bascule silencieusement sur l'implémentation JS identique. `moteur` indique
// laquelle des deux a répondu, pour être transparent côté frontend/logs.
async function scheduleNextReview({ quality, repetitions, easeFactor, interval }) {
  try {
    const { data } = await axios.post(
      `${PYTHON_ENGINE_URL}/schedule`,
      { quality, repetitions, ease_factor: easeFactor, interval },
      { timeout: 2000 }
    );
    return { ...data, moteur: 'python' };
  } catch (error) {
    const data = computeSM2({ quality, repetitions, easeFactor, interval });
    return { ...data, moteur: 'fallback-js' };
  }
}

const MATIERE_POPULATE = { path: 'matiere', populate: { path: 'semestre', populate: { path: 'niveau', populate: { path: 'option', populate: { path: 'faculte' } } } } };

// 🟢 Construit le filtre de questions autorisées pour CET utilisateur : un
// étudiant ne doit jamais recevoir une question d'une matière hors abonnement,
// même en filtrant explicitement par ?matiere= dans la requête (§10 de la spec).
async function buildAllowedQuestionFilter(req) {
  const filter = { actif: true };
  const { matiere } = req.query;

  if (req.user.role === 'student') {
    const accessibleMatiereIds = await getAccessibleMatiereIds(req.user.id);
    if (matiere && !accessibleMatiereIds.includes(matiere)) {
      return null; // matière demandée hors accès → aucune question
    }
    filter.matiere = matiere ? matiere : { $in: accessibleMatiereIds };
  } else if (matiere) {
    filter.matiere = matiere;
  }

  return filter;
}

/* =======================================================
   FILE DE RÉVISION DU JOUR
======================================================= */

// GET /api/revision/queue?limit=10&matiere=...
exports.getQueue = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const questionFilter = await buildAllowedQuestionFilter(req);

    if (!questionFilter || (Array.isArray(questionFilter.matiere?.$in) && questionFilter.matiere.$in.length === 0)) {
      return res.status(200).json({ status: 'success', count: 0, queue: [], aucunAbonnementActif: true });
    }

    // 1) Cartes en retard ou dues aujourd'hui (déjà vues au moins une fois)
    const dueProgress = await RevisionProgress.find({
      user: req.user.id,
      nextReviewDate: { $lte: new Date() }
    })
      .populate({ path: 'question', match: questionFilter, populate: MATIERE_POPULATE })
      .sort({ nextReviewDate: 1 })
      .limit(limit);

    const dueQuestions = dueProgress.filter((p) => p.question).map((p) => ({
      question: p.question,
      progress: p,
      statut: 'due'
    }));

    let remaining = limit - dueQuestions.length;
    let newQuestions = [];

    if (remaining > 0) {
      const seenIds = await RevisionProgress.find({ user: req.user.id }).distinct('question');
      const fresh = await Question.find({ ...questionFilter, _id: { $nin: seenIds } })
        .populate(MATIERE_POPULATE)
        .limit(remaining);
      newQuestions = fresh.map((q) => ({ question: q, progress: null, statut: 'nouvelle' }));
    }

    res.status(200).json({
      status: 'success',
      count: dueQuestions.length + newQuestions.length,
      queue: [...dueQuestions, ...newQuestions]
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* =======================================================
   SOUMISSION D'UNE RÉPONSE
======================================================= */

// POST /api/revision/answer   Body: { questionId, quality (0-5) }
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, quality } = req.body;

    if (quality === undefined || quality < 0 || quality > 5) {
      return res.status(400).json({ status: 'error', message: 'quality doit être un entier entre 0 et 5.' });
    }

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ status: 'error', message: 'Question introuvable.' });

    // 🟢 Re-vérifié ici aussi : même si la question apparaissait dans une file
    // récupérée plus tôt, l'abonnement a pu expirer entre-temps.
    if (req.user.role === 'student') {
      const accessibleMatiereIds = await getAccessibleMatiereIds(req.user.id);
      if (!accessibleMatiereIds.includes(question.matiere.toString())) {
        return res.status(403).json({ status: 'error', message: "Vous n'avez plus d'abonnement actif pour cette matière." });
      }
    }

    let progress = await RevisionProgress.findOne({ user: req.user.id, question: questionId });
    if (!progress) {
      progress = new RevisionProgress({ user: req.user.id, question: questionId });
    }

    // 🟢 Automatisation : le moteur Python (ou son repli JS) calcule le
    // prochain intervalle optimal selon l'algorithme SM-2.
    const scheduled = await scheduleNextReview({
      quality,
      repetitions: progress.repetitions,
      easeFactor: progress.easeFactor,
      interval: progress.interval
    });

    progress.repetitions = scheduled.repetitions;
    progress.easeFactor = scheduled.ease_factor;
    progress.interval = scheduled.interval;
    progress.nextReviewDate = new Date(scheduled.next_review_date);
    progress.mastered = scheduled.mastered;
    progress.lastQuality = quality;
    progress.lastReviewedAt = new Date();
    progress.totalReviews += 1;
    progress.correctStreak = quality >= 3 ? progress.correctStreak + 1 : 0;

    await progress.save();

    res.status(200).json({
      status: 'success',
      moteur: scheduled.moteur, // 'python' si le micro-service a répondu, 'fallback-js' sinon
      correct: quality >= 3,
      reponseCorrecte: question.reponseCorrecte,
      explication: question.explication,
      progress: {
        repetitions: progress.repetitions,
        easeFactor: progress.easeFactor,
        interval: progress.interval,
        nextReviewDate: progress.nextReviewDate,
        mastered: progress.mastered,
        correctStreak: progress.correctStreak
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* =======================================================
   STATISTIQUES
======================================================= */

// GET /api/revision/stats
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 🟢 Le total de questions "disponibles" doit lui aussi respecter l'abonnement,
    // sinon le pourcentage de progression serait calculé sur du contenu inaccessible.
    let questionFilter = { actif: true };
    if (req.user.role === 'student') {
      const accessibleMatiereIds = await getAccessibleMatiereIds(userId);
      questionFilter.matiere = { $in: accessibleMatiereIds };
    }

    const [totalQuestions, seenCount, dueToday, masteredCount, progresses] = await Promise.all([
      Question.countDocuments(questionFilter),
      RevisionProgress.countDocuments({ user: userId }),
      RevisionProgress.countDocuments({ user: userId, nextReviewDate: { $lte: new Date() } }),
      RevisionProgress.countDocuments({ user: userId, mastered: true }),
      RevisionProgress.find({ user: userId }).populate({ path: 'question', populate: MATIERE_POPULATE })
    ]);

    const bySubjectMap = {};
    progresses.forEach((p) => {
      if (!p.question?.matiere) return;
      const key = p.question.matiere._id.toString();
      if (!bySubjectMap[key]) {
        bySubjectMap[key] = { matiereId: key, matiere: p.question.matiere.nom, breadcrumb: fromMatiere(p.question.matiere), revisees: 0, maitrisees: 0 };
      }
      bySubjectMap[key].revisees += 1;
      if (p.mastered) bySubjectMap[key].maitrisees += 1;
    });

    res.status(200).json({
      status: 'success',
      stats: {
        totalQuestions,
        cartesVues: seenCount,
        cartesNouvelles: Math.max(totalQuestions - seenCount, 0),
        dueToday,
        masteredCount,
        progressionGlobale: totalQuestions > 0 ? Math.round((masteredCount / totalQuestions) * 100) : 0
      },
      bySubject: Object.values(bySubjectMap)
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
