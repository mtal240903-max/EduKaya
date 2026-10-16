import api from './api';

const unwrap = (promise) =>
  promise.then((res) => res.data).catch((error) => {
    throw error.response?.data || { message: 'Erreur de chargement.' };
  });

export const libraryService = {
  // params optionnels : { niveau, semestre, matiere, categorie, search }
  getDocuments: (params = {}) => unwrap(api.get('/library/documents', { params })),
  getDocumentById: (id) => unwrap(api.get(`/library/documents/${id}`)),
  getFavorites: () => unwrap(api.get('/library/documents/favorites')),
  toggleFavorite: (id) => unwrap(api.patch(`/library/documents/${id}/favorite`)),

  // Réservé Admin / Super-Admin
  createDocument: (payload) => unwrap(api.post('/library/documents', payload)),
  updateDocument: (id, payload) => unwrap(api.put(`/library/documents/${id}`, payload)),

  // 🔒 Upload + création en une seule requête, fichier envoyé à NOTRE backend
  // (jamais directement à Cloudinary depuis l'app — voir cloudinaryService.js
  // pour le détail de ce que ça corrige). `formData` doit contenir le champ
  // `file` + les champs du document (titre, matiere, categorie, ...).
  uploadDocument: (formData, onProgress) =>
    unwrap(api.post('/library/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(event.loaded / event.total);
      },
    })),
};

export default libraryService;
