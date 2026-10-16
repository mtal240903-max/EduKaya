const express = require('express');
const router = express.Router();
const { protect, adminOnly, superAdminOnly, requireScope } = require('../middleware/authMiddleware');
const {
  getDashboardStats,
  getUsers,
  updateUserRole,
  toggleBanUser,
  deleteUser,
  getAllDocumentsForModeration,
  updateDocumentStatus,
  deleteDocument,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getAdministrators,
  createAdministrator,
  updateAdminScopes,
  getAuditLog
} = require('../controllers/adminController');

// Toutes les routes de ce fichier exigent d'être connecté
router.use(protect);

/* ============ TABLEAU DE BORD ============ */
router.get('/dashboard', adminOnly, getDashboardStats);

/* ============ UTILISATEURS ============ */
// La lecture reste ouverte à tout admin (vue d'ensemble utile à tous les périmètres).
router.get('/users', adminOnly, getUsers);
router.patch('/users/:id/role', superAdminOnly, updateUserRole);              // Réservé Super-Admin
router.patch('/users/:id/ban', requireScope('utilisateurs'), toggleBanUser);  // Scope Admin Utilisateurs
router.delete('/users/:id', superAdminOnly, deleteUser);                      // Réservé Super-Admin

/* ============ MODÉRATION DES DOCUMENTS ============ */
router.get('/documents', adminOnly, getAllDocumentsForModeration);
router.patch('/documents/:id/status', requireScope('bibliotheque'), updateDocumentStatus);
router.delete('/documents/:id', requireScope('bibliotheque'), deleteDocument);

/* ============ QUESTIONS DE RÉVISION ============ */
router.get('/questions', adminOnly, getQuestions);
router.post('/questions', requireScope('revision'), createQuestion);
router.put('/questions/:id', requireScope('revision'), updateQuestion);
router.delete('/questions/:id', requireScope('revision'), deleteQuestion);

/* ============ GESTION DES ADMINISTRATEURS (Super-Admin uniquement) ============ */
router.get('/administrators', superAdminOnly, getAdministrators);
router.post('/administrators', superAdminOnly, createAdministrator);
router.patch('/administrators/:id/scopes', superAdminOnly, updateAdminScopes);

/* ============ JOURNAL D'AUDIT (Super-Admin uniquement) ============ */
router.get('/audit-log', superAdminOnly, getAuditLog);

module.exports = router;
