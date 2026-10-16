import api from './api';

const unwrap = (promise) =>
  promise.then((res) => res.data).catch((error) => {
    throw error.response?.data || { message: 'Erreur réseau.' };
  });

// 'level' est l'un de : facultes | options | niveaux | semestres | matieres | chapitres
export const hierarchyService = {
  getLevel: (level, parentId) => unwrap(api.get(`/hierarchy/${level}`, { params: parentId ? { parentId } : {} })),
  // Liste plate avec fil d'Ariane, pour les sélecteurs de formulaires (level: semestres|matieres|chapitres)
  getFlatList: (level) => unwrap(api.get(`/hierarchy/flat/${level}`)),
  createLevelItem: (level, nom, parentId) => unwrap(api.post(`/hierarchy/${level}`, { nom, parentId })),
  updateLevelItem: (level, id, nom) => unwrap(api.put(`/hierarchy/${level}/${id}`, { nom })),
  toggleLevelItem: (level, id) => unwrap(api.patch(`/hierarchy/${level}/${id}/toggle`)),
  deleteLevelItem: (level, id) => unwrap(api.delete(`/hierarchy/${level}/${id}`)),
};

export default hierarchyService;
