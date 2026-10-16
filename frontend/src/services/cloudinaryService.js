import libraryService from './libraryService';

// 🔒 Avant : ce fichier uploadait le document DIRECTEMENT depuis l'app vers
// Cloudinary, avec un "unsigned upload preset". Le cloud name et le preset
// étaient injectés dans le bundle JS via EXPO_PUBLIC_CLOUDINARY_* — donc
// lisibles en clair par quiconque décompile l'APK (c'est juste du texte dans
// le bundle JS). Avec ces deux valeurs, n'importe qui pouvait uploader des
// fichiers arbitraires sur le compte Cloudinary d'EduKaya, sans jamais passer
// par un token admin ni par l'API EduKaya elle-même.
//
// Maintenant : le fichier est envoyé à NOTRE backend (déjà protégé par JWT +
// scope 'bibliotheque'), qui réalise lui-même l'upload Cloudinary avec des
// identifiants qui ne quittent jamais le serveur (voir
// backend/src/config/cloudinary.js). Ce module ne fait plus que construire le
// FormData et déléguer à libraryService — conservé pour ne pas casser les
// imports existants dans l'app.
export async function uploadDocumentToCloudinary(file, fields, onProgress) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name || 'document',
    type: file.mimeType || 'application/octet-stream',
  });
  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });

  return libraryService.uploadDocument(formData, onProgress);
}

export default { uploadDocumentToCloudinary };
