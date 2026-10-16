const cloudinary = require('cloudinary').v2;

// 🔒 Upload Cloudinary SIGNÉ, exécuté uniquement côté serveur.
//
// Avant, l'app mobile uploadait directement vers Cloudinary avec un "unsigned
// preset" : le cloud name et le preset étaient embarqués dans le bundle de
// l'app (donc extractibles par n'importe qui depuis l'APK). N'importe qui
// pouvait alors uploader des fichiers arbitraires sur le compte Cloudinary,
// sans jamais passer par l'authentification ni les droits admin d'EduKaya —
// l'upload n'était protégé par RIEN.
//
// Maintenant : la clé API + le secret Cloudinary restent uniquement dans le
// .env du serveur (jamais envoyés au client). L'app envoie le fichier à notre
// propre backend (route protégée par JWT + scope 'bibliotheque'), qui se
// charge lui-même de l'upload vers Cloudinary.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const isCloudinaryConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

module.exports = { cloudinary, isCloudinaryConfigured };
