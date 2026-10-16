const { cloudinary } = require('../config/cloudinary');

// Envoie un Buffer en mémoire vers Cloudinary via son API d'upload "stream"
// (pas de fichier temporaire écrit sur le disque du serveur). Partagé entre
// l'upload de documents (libraryController) et l'upload de photo de profil
// (authController) — même mécanique, juste un dossier Cloudinary différent.
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder: 'edukaya-documents', ...options },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
}

module.exports = { uploadBufferToCloudinary };
