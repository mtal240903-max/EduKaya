import api from './api';

const unwrap = (promise) =>
  promise.then((res) => res.data).catch((error) => {
    throw error.response?.data || { message: 'Erreur réseau.' };
  });

export const revisionService = {
  // File du jour : cartes dues + nouvelles cartes, jusqu'à `limit`
  getQueue: (params = {}) => unwrap(api.get('/revision/queue', { params })),

  // quality: 0 (trou noir) à 5 (parfait) — voir le mapping UI dans RevisionScreen
  submitAnswer: (questionId, quality) => unwrap(api.post('/revision/answer', { questionId, quality })),

  getStats: () => unwrap(api.get('/revision/stats')),
};

export default revisionService;
