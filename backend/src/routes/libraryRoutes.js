const express = require('express');
const router = express.Router();
const {
  getDocuments,
  getDocumentById,
  createDocument,
  uploadDocument,
  updateDocument,
  toggleFavorite,
  getFavoriteDocuments
} = require('../controllers/libraryController');
const { protect, requireScope } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ================= ROUTES PROTÉGÉES (utilisateur connecté) =================

router.get('/documents', protect, getDocuments);

// D'ABORD les routes statiques/spécifiques (AVANT /:id)
router.get('/documents/favorites', protect, getFavoriteDocuments);

// ENSUITE les routes dynamiques avec paramètre
router.get('/documents/:id', protect, getDocumentById);

// ================= ROUTES D'ACTIONS UTILISATEUR =================

router.patch('/documents/:id/favorite', protect, toggleFavorite);

// ================= ROUTES ADMINISTRATEUR =================

// 🔒 Upload + création en une seule requête : le fichier transite par CE
// serveur (jamais directement app → Cloudinary) et l'upload est signé avec
// des identifiants Cloudinary qui ne quittent jamais le backend.
router.post('/documents/upload', protect, requireScope('bibliotheque'), upload.single('file'), uploadDocument);

// Conservée pour les cas où l'URL du fichier est déjà connue (ex. réutilisation
// d'un document existant) — ne doit plus être utilisée pour un upload direct
// depuis le client.
router.post('/documents', protect, requireScope('bibliotheque'), createDocument);
router.put('/documents/:id', protect, requireScope('bibliotheque'), updateDocument);

module.exports = router;
