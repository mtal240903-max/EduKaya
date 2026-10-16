const Plan = require('../models/Plan');
const Abonnement = require('../models/Abonnement');
const Semestre = require('../models/Semestre');
const User = require('../models/User');
const { fromSemestre } = require('../utils/breadcrumb');

const SEMESTRE_POPULATE = { path: 'semestre', populate: { path: 'niveau', populate: { path: 'option', populate: { path: 'faculte' } } } };

function withBreadcrumb(plan) {
  const obj = plan.toObject ? plan.toObject() : plan;
  obj.semestreBreadcrumb = fromSemestre(obj.semestre);
  return obj;
}

/* =======================================================
   PLANS (lecture publique, écriture = scope abonnements)
======================================================= */

// GET /api/plans — plans actifs, visibles par tout utilisateur connecté
exports.getPublicPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ actif: true }).populate(SEMESTRE_POPULATE).sort({ prix: 1 });
    res.status(200).json({ status: 'success', count: plans.length, plans: plans.map(withBreadcrumb) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/admin/plans — tous les plans, y compris désactivés (Admin Abonnements)
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find({}).populate(SEMESTRE_POPULATE).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', count: plans.length, plans: plans.map(withBreadcrumb) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/admin/plans — 🟢 le semestre est désormais obligatoire (§6/§7 de la spec)
exports.createPlan = async (req, res) => {
  try {
    const { nom, description, prix, devise, dureeJours, fonctionnalites, semestre } = req.body;
    if (!nom || prix === undefined || !dureeJours || !semestre) {
      return res.status(400).json({ status: 'error', message: 'nom, prix, dureeJours et semestre sont requis.' });
    }

    const semestreDoc = await Semestre.findById(semestre);
    if (!semestreDoc) {
      return res.status(404).json({ status: 'error', message: 'Semestre introuvable — sélectionne-le depuis la liste.' });
    }

    const plan = await Plan.create({
      nom, description, prix, devise: devise || 'XOF', dureeJours, semestre,
      fonctionnalites: Array.isArray(fonctionnalites) ? fonctionnalites : [],
      creePar: req.user.id
    });

    res.status(201).json({ status: 'success', message: 'Plan créé.', plan });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// PUT /api/admin/plans/:id
exports.updatePlan = async (req, res) => {
  try {
    const allowedFields = ['nom', 'description', 'prix', 'devise', 'dureeJours', 'fonctionnalites', 'actif', 'semestre'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.semestre) {
      const semestreDoc = await Semestre.findById(updates.semestre);
      if (!semestreDoc) return res.status(404).json({ status: 'error', message: 'Semestre introuvable.' });
    }

    const plan = await Plan.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ status: 'error', message: 'Plan introuvable.' });

    res.status(200).json({ status: 'success', message: 'Plan mis à jour.', plan });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// DELETE /api/admin/plans/:id — refusé si des abonnements existent encore sur ce plan
exports.deletePlan = async (req, res) => {
  try {
    const usageCount = await Abonnement.countDocuments({ plan: req.params.id });
    if (usageCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Impossible de supprimer : ${usageCount} abonnement(s) utilisent encore ce plan. Désactive-le plutôt.`
      });
    }

    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ status: 'error', message: 'Plan introuvable.' });

    res.status(200).json({ status: 'success', message: 'Plan supprimé.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* =======================================================
   ABONNEMENTS (scope abonnements)
======================================================= */

// GET /api/admin/subscriptions?statut=&search=
exports.getSubscriptions = async (req, res) => {
  try {
    const { statut } = req.query;

    // Les abonnements "actifs" dont la date de fin est dépassée sont marqués "expire" à la volée.
    // ⚠️ C'est un confort d'affichage pour l'admin — le contrôle d'accès réel (accessControl.js)
    // ne se fie jamais à ce champ 'statut' et revérifie toujours dateFin en temps réel.
    await Abonnement.updateMany(
      { statut: 'actif', dateFin: { $lt: new Date() } },
      { $set: { statut: 'expire' } }
    );

    let filter = {};
    if (statut) filter.statut = statut;

    const subscriptions = await Abonnement.find(filter)
      .populate('user', 'nom email')
      .populate('plan', 'nom prix devise dureeJours')
      .populate(SEMESTRE_POPULATE)
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      count: subscriptions.length,
      subscriptions: subscriptions.map((s) => ({ ...s.toObject(), semestreBreadcrumb: fromSemestre(s.semestre) }))
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/admin/subscriptions — assigne manuellement un plan à un utilisateur
// Body: { email, planId }
exports.createSubscription = async (req, res) => {
  try {
    const { email, planId } = req.body;
    if (!email || !planId) {
      return res.status(400).json({ status: 'error', message: 'email et planId sont requis.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ status: 'error', message: 'Aucun utilisateur avec cet email.' });

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ status: 'error', message: 'Plan introuvable.' });

    const dateDebut = new Date();
    const dateFin = new Date(dateDebut.getTime() + plan.dureeJours * 24 * 60 * 60 * 1000);

    const abonnement = await Abonnement.create({
      user: user._id, plan: plan._id, semestre: plan.semestre, dateDebut, dateFin, statut: 'actif', assignePar: req.user.id
    });

    const populated = await abonnement.populate([
      { path: 'user', select: 'nom email' },
      { path: 'plan', select: 'nom prix devise dureeJours' }
    ]);

    res.status(201).json({ status: 'success', message: 'Abonnement créé.', subscription: populated });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/admin/subscriptions/:id/cancel
exports.cancelSubscription = async (req, res) => {
  try {
    const abonnement = await Abonnement.findByIdAndUpdate(
      req.params.id,
      { statut: 'annule' },
      { new: true }
    );
    if (!abonnement) return res.status(404).json({ status: 'error', message: 'Abonnement introuvable.' });

    res.status(200).json({ status: 'success', message: 'Abonnement annulé.', subscription: abonnement });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/admin/subscriptions/stats
exports.getSubscriptionStats = async (req, res) => {
  try {
    const [totalActifs, totalExpires, totalAnnules, abonnementsActifs] = await Promise.all([
      Abonnement.countDocuments({ statut: 'actif' }),
      Abonnement.countDocuments({ statut: 'expire' }),
      Abonnement.countDocuments({ statut: 'annule' }),
      Abonnement.find({ statut: 'actif' }).populate('plan', 'prix devise')
    ]);

    const revenuMensuelEstime = abonnementsActifs.reduce((sum, a) => sum + (a.plan?.prix || 0), 0);

    res.status(200).json({
      status: 'success',
      stats: { totalActifs, totalExpires, totalAnnules, revenuMensuelEstime }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
