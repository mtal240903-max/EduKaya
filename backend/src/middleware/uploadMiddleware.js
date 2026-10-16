const multer = require('multer');

// Fichier reçu en mémoire (Buffer) puis streamé directement vers Cloudinary —
// jamais écrit sur le disque du serveur, donc rien à nettoyer et aucun chemin
// de fichier à faire confiance.
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 Mo — cohérent avec un cours/poly scanné

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('Type de fichier non autorisé. Formats acceptés : PDF, Word, PowerPoint, Excel, images.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

module.exports = upload;
