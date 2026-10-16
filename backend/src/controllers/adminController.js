const User = require('../models/User');
const Document = require('../models/Document');
const Question = require('../models/Question');
const AuditLog = require('../models/AuditLog');
const Matiere = require('../models/Matiere');
const Chapitre = require('../models/Chapitre');
const { fromMatiere } = require('../utils/breadcrumb');
const { escapeRegex } = require('../utils/escapeRegex');

// 🟢 Consigne une action sensible dans le journal d'audit. N'échoue jamais
// bruyamment : une erreur de log ne doit pas faire échouer l'action elle-même.
async function logAction(req, action, cibleType, cibleId, details) {
  try {
    await AuditLog.create({ acteur: req.user.id, action, cibleType, cibleId, details });
  } catch (e) {
    console.error('Erreur audit log (non bloquant) :', e.message);
  }
}

/* =======================================================
   TABLEAU DE BORD (Admin + Super-Admin)
======================================================= */

// GET /api/admin/dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalAdmins, totalDocuments, activeDocuments, archivedDocuments, bannedUsers] =
      await Promise.all([
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: { $in: ['admin', 'super-admin'] } }),
        Document.countDocuments({}),
        Document.countDocuments({ statut: 'actif' }),
        Document.countDocuments({ statut: 'archive' }),
        User.countDocuments({ banni: true })
      ]);

    const recentDocuments = await Document.find({}).sort({ createdAt: -1 }).limit(5);
    const recentUsers = await User.find({}).select('-password').sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      status: 'success',
      stats: { totalUsers, totalAdmins, totalDocuments, activeDocuments, archivedDocuments, bannedUsers },
      recentDocuments,
      recentUsers
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* =======================================================
   GESTION DES UTILISATEURS
======================================================= */

// GET /api/admin/users  (Admin + Super-Admin)
exports.getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    let filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { nom: { $regex: escapeRegex(search), $options: 'i' } },
        { email: { $regex: escapeRegex(search), $options: 'i' } }
      ];
    }

    const users = await User.find(filter).select('-password -refreshToken').sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', count: users.length, users });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/admin/users/:id/role  (Super-Admin uniquement)
// Body: { role: 'student' | 'admin' | 'super-admin' }
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'admin', 'super-admin'].includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Rôle invalide.' });
    }

    // 🟢 Personne ne modifie son propre rôle, jamais — pas même un Super Admin.
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ status: 'error', message: 'Vous ne pouvez pas modifier votre propre rôle.' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ status: 'error', message: 'Utilisateur introuvable.' });

    // 🟢 Le système garde toujours au moins un Super Admin actif.
    if (targetUser.role === 'super-admin' && role !== 'super-admin') {
      const superAdminCount = await User.countDocuments({ role: 'super-admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ status: 'error', message: 'Impossible de rétrograder le dernier Super Admin restant.' });
      }
    }

    const ancienRole = targetUser.role;
    targetUser.role = role;
    // Un compte qui redevient 'student' ou qui devient 'super-admin' n'a plus besoin de scopes détaillés
    if (role !== 'admin') targetUser.adminScopes = [];
    await targetUser.save();

    await logAction(req, 'modification_role', 'User', targetUser._id, { avant: ancienRole, apres: role });

    const safeUser = targetUser.toObject();
    delete safeUser.password;
    delete safeUser.refreshToken;

    res.status(200).json({ status: 'success', message: `Rôle mis à jour : ${role}`, user: safeUser });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/admin/users/:id/ban  (Admin + Super-Admin)
exports.toggleBanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'Utilisateur introuvable.' });

    if (user.role === 'super-admin') {
      return res.status(403).json({ status: 'error', message: 'Impossible de suspendre un compte Super-Admin.' });
    }

    user.banni = !user.banni;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: user.banni ? 'Utilisateur suspendu.' : 'Utilisateur réactivé.',
      banni: user.banni
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// DELETE /api/admin/users/:id  (Super-Admin uniquement)
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ status: 'error', message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'Utilisateur introuvable.' });

    // 🟢 Un Super Admin peut supprimer un autre Super Admin, sauf si c'est le dernier.
    if (user.role === 'super-admin') {
      const superAdminCount = await User.countDocuments({ role: 'super-admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ status: 'error', message: 'Impossible de supprimer le dernier Super Admin restant.' });
      }
    }

    await user.deleteOne();
    await logAction(req, 'suppression_compte', 'User', user._id, { email: user.email, role: user.role });

    res.status(200).json({ status: 'success', message: 'Utilisateur supprimé.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* =======================================================
   GESTION DES ADMINISTRATEURS (Super-Admin uniquement)
======================================================= */

// GET /api/admin/administrators — liste tous les comptes admin + super-admin
exports.getAdministrators = async (req, res) => {
  try {
    const administrators = await User.find({ role: { $in: ['admin', 'super-admin'] } })
      .select('-password -refreshToken')
      .sort({ role: 1, createdAt: -1 });
    res.status(200).json({ status: 'success', count: administrators.length, administrators });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/admin/administrators — promeut un étudiant existant en admin, avec ses scopes
// Body: { email, scopes: ['bibliotheque', ...] }
exports.createAdministrator = async (req, res) => {
  try {
    const { email, scopes } = req.body;
    if (!email) {
      return res.status(400).json({ status: 'error', message: "L'email de l'utilisateur à promouvoir est requis." });
    }

    const validScopes = ['bibliotheque', 'revision', 'utilisateurs', 'abonnements'];
    const cleanScopes = Array.isArray(scopes) ? scopes.filter((s) => validScopes.includes(s)) : [];

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ status: 'error', message: "Aucun compte n'existe avec cet email. La personne doit d'abord s'inscrire dans l'app." });
    }
    if (user.role === 'super-admin') {
      return res.status(400).json({ status: 'error', message: 'Ce compte est déjà Super Admin.' });
    }

    user.role = 'admin';
    user.adminScopes = cleanScopes;
    await user.save();

    await logAction(req, 'creation_admin', 'User', user._id, { email: user.email, scopes: cleanScopes });

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.refreshToken;

    res.status(201).json({ status: 'success', message: 'Administrateur créé.', administrator: safeUser });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/admin/administrators/:id/scopes — Body: { scopes: [...] }
exports.updateAdminScopes = async (req, res) => {
  try {
    const { scopes } = req.body;
    const validScopes = ['bibliotheque', 'revision', 'utilisateurs', 'abonnements'];
    if (!Array.isArray(scopes) || scopes.some((s) => !validScopes.includes(s))) {
      return res.status(400).json({ status: 'error', message: 'Scopes invalides.' });
    }

    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ status: 'error', message: 'Vous ne pouvez pas modifier vos propres périmètres.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'Utilisateur introuvable.' });
    if (user.role !== 'admin') {
      return res.status(400).json({ status: 'error', message: "Seul un compte 'admin' a des périmètres à gérer." });
    }

    const anciensScopes = user.adminScopes;
    user.adminScopes = scopes;
    await user.save();

    await logAction(req, 'modification_scopes', 'User', user._id, { avant: anciensScopes, apres: scopes });

    res.status(200).json({ status: 'success', message: 'Périmètres mis à jour.', adminScopes: user.adminScopes });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* =======================================================
   JOURNAL D'AUDIT (Super-Admin uniquement)
======================================================= */

// GET /api/admin/audit-log?action=&limit=
exports.getAuditLog = async (req, res) => {
  try {
    const { action, limit } = req.query;
    let filter = {};
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .populate('acteur', 'nom email role')
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 200));

    res.status(200).json({ status: 'success', count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* =======================================================
   MODÉRATION DES DOCUMENTS (Admin + Super-Admin)
======================================================= */

// GET /api/admin/documents (tous statuts, contrairement à /api/library/documents)
exports.getAllDocumentsForModeration = async (req, res) => {
  try {
    const { statut, matiere, search } = req.query;
    let filter = {};
    if (statut) filter.statut = statut;
    if (matiere) filter.matiere = matiere;
    if (search) {
      filter.$or = [
        { titre: { $regex: escapeRegex(search), $options: 'i' } },
        { auteur: { $regex: escapeRegex(search), $options: 'i' } }
      ];
    }

    const documents = await Document.find(filter)
      .populate({ path: 'matiere', populate: { path: 'semestre', populate: { path: 'niveau', populate: { path: 'option', populate: { path: 'faculte' } } } } })
      .sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', count: documents.length, documents: documents.map((d) => ({ ...d.toObject(), matiereBreadcrumb: fromMatiere(d.matiere) })) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/admin/documents/:id/status  Body: { statut: 'actif' | 'archive' }
exports.updateDocumentStatus = async (req, res) => {
  try {
    const { statut } = req.body;
    if (!['actif', 'archive'].includes(statut)) {
      return res.status(400).json({ status: 'error', message: 'Statut invalide.' });
    }

    const document = await Document.findByIdAndUpdate(req.params.id, { statut }, { new: true });
    if (!document) return res.status(404).json({ status: 'error', message: 'Document introuvable.' });

    res.status(200).json({ status: 'success', message: `Document ${statut === 'actif' ? 'republié' : 'archivé'}.`, document });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// DELETE /api/admin/documents/:id
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findByIdAndDelete(req.params.id);
    if (!document) return res.status(404).json({ status: 'error', message: 'Document introuvable.' });

    res.status(200).json({ status: 'success', message: 'Document supprimé définitivement.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* =======================================================
   GESTION DES QUESTIONS DE RÉVISION (Admin + Super-Admin)
======================================================= */

async function validateQuestionHierarchy({ matiere, chapitre }) {
  const matiereDoc = await Matiere.findById(matiere);
  if (!matiereDoc) throw new Error('Matière introuvable — sélectionne-la depuis la liste.');
  if (chapitre) {
    const chapitreDoc = await Chapitre.findById(chapitre);
    if (!chapitreDoc) throw new Error('Chapitre introuvable.');
    if (chapitreDoc.matiere.toString() !== matiere) {
      throw new Error("Ce chapitre n'appartient pas à la matière sélectionnée.");
    }
  }
}

// GET /api/admin/questions
exports.getQuestions = async (req, res) => {
  try {
    const { matiere, search } = req.query;
    let filter = {};
    if (matiere) filter.matiere = matiere;
    if (search) filter.question = { $regex: escapeRegex(search), $options: 'i' };

    const questions = await Question.find(filter)
      .populate({ path: 'matiere', populate: { path: 'semestre', populate: { path: 'niveau', populate: { path: 'option', populate: { path: 'faculte' } } } } })
      .sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      count: questions.length,
      questions: questions.map((q) => ({ ...q.toObject(), matiereBreadcrumb: fromMatiere(q.matiere) }))
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/admin/questions
exports.createQuestion = async (req, res) => {
  try {
    const { document, matiere, chapitre, question, options, reponseCorrecte, explication, difficulte } = req.body;

    if (!matiere || !question || !Array.isArray(options) || options.length < 2 || reponseCorrecte === undefined) {
      return res.status(400).json({ status: 'error', message: 'matiere, question, au moins 2 options et reponseCorrecte sont requis.' });
    }
    if (reponseCorrecte < 0 || reponseCorrecte >= options.length) {
      return res.status(400).json({ status: 'error', message: 'reponseCorrecte doit être un index valide dans options.' });
    }
    await validateQuestionHierarchy({ matiere, chapitre });

    const newQuestion = await Question.create({
      document, matiere, chapitre, question, options, reponseCorrecte, explication, difficulte,
      publieePar: req.user.id
    });

    res.status(201).json({ status: 'success', message: 'Question créée.', question: newQuestion });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// PUT /api/admin/questions/:id
exports.updateQuestion = async (req, res) => {
  try {
    const allowedFields = ['document', 'matiere', 'chapitre', 'question', 'options', 'reponseCorrecte', 'explication', 'difficulte', 'actif'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.matiere || updates.chapitre) {
      const existing = await Question.findById(req.params.id);
      if (!existing) return res.status(404).json({ status: 'error', message: 'Question introuvable.' });
      await validateQuestionHierarchy({
        matiere: updates.matiere || existing.matiere.toString(),
        chapitre: updates.chapitre !== undefined ? updates.chapitre : existing.chapitre?.toString()
      });
    }

    const question = await Question.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!question) return res.status(404).json({ status: 'error', message: 'Question introuvable.' });

    res.status(200).json({ status: 'success', message: 'Question mise à jour.', question });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// DELETE /api/admin/questions/:id
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ status: 'error', message: 'Question introuvable.' });
    res.status(200).json({ status: 'success', message: 'Question supprimée.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
