const express = require('express');
const router = express.Router();
const { protect, superAdminOnly } = require('../middleware/authMiddleware');
const {
  getLevel,
  getFlatList,
  createLevelItem,
  updateLevelItem,
  toggleLevelItem,
  deleteLevelItem
} = require('../controllers/hierarchyController');

router.use(protect);

// ⚠️ Doit être déclarée AVANT '/:level', sinon Express matcherait '/flat/matieres'
// comme '/:level' avec level = 'flat'.
router.get('/flat/:level', getFlatList);

// Lecture ouverte à tout utilisateur connecté : les admins Documents/Révision/Abonnements
// en ont besoin pour rattacher leur contenu, et un futur écran étudiant pourra aussi
// naviguer l'arborescence pour choisir un semestre à souscrire.
router.get('/:level', getLevel);

// Écriture réservée au Super Admin (voir §3 du document conceptuel : la structure
// académique n'est jamais déléguée à un admin spécialisé).
router.post('/:level', superAdminOnly, createLevelItem);
router.put('/:level/:id', superAdminOnly, updateLevelItem);
router.patch('/:level/:id/toggle', superAdminOnly, toggleLevelItem);
router.delete('/:level/:id', superAdminOnly, deleteLevelItem);

module.exports = router;
