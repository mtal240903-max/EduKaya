import api from './api';

const unwrap = (promise) =>
  promise.then((res) => res.data).catch((error) => {
    throw error.response?.data || { message: 'Erreur réseau.' };
  });

export const adminService = {
  // ---- Tableau de bord ----
  getDashboard: () => unwrap(api.get('/admin/dashboard')),

  // ---- Utilisateurs ----
  getUsers: (params = {}) => unwrap(api.get('/admin/users', { params })),
  updateUserRole: (id, role) => unwrap(api.patch(`/admin/users/${id}/role`, { role })),
  toggleBanUser: (id) => unwrap(api.patch(`/admin/users/${id}/ban`)),
  deleteUser: (id) => unwrap(api.delete(`/admin/users/${id}`)),

  // ---- Modération des documents ----
  getDocumentsForModeration: (params = {}) => unwrap(api.get('/admin/documents', { params })),
  updateDocumentStatus: (id, statut) => unwrap(api.patch(`/admin/documents/${id}/status`, { statut })),
  deleteDocument: (id) => unwrap(api.delete(`/admin/documents/${id}`)),

  // ---- Questions de révision ----
  getQuestions: (params = {}) => unwrap(api.get('/admin/questions', { params })),
  createQuestion: (payload) => unwrap(api.post('/admin/questions', payload)),
  updateQuestion: (id, payload) => unwrap(api.put(`/admin/questions/${id}`, payload)),
  deleteQuestion: (id) => unwrap(api.delete(`/admin/questions/${id}`)),

  // ---- Administrateurs (Super-Admin uniquement) ----
  getAdministrators: () => unwrap(api.get('/admin/administrators')),
  createAdministrator: (payload) => unwrap(api.post('/admin/administrators', payload)),
  updateAdminScopes: (id, scopes) => unwrap(api.patch(`/admin/administrators/${id}/scopes`, { scopes })),

  // ---- Journal d'audit (Super-Admin uniquement) ----
  getAuditLog: (params = {}) => unwrap(api.get('/admin/audit-log', { params })),

  // ---- Plans d'abonnement (scope abonnements) ----
  getPlans: () => unwrap(api.get('/admin/plans')),
  createPlan: (payload) => unwrap(api.post('/admin/plans', payload)),
  updatePlan: (id, payload) => unwrap(api.put(`/admin/plans/${id}`, payload)),
  deletePlan: (id) => unwrap(api.delete(`/admin/plans/${id}`)),

  // ---- Abonnements des utilisateurs (scope abonnements) ----
  getSubscriptions: (params = {}) => unwrap(api.get('/admin/subscriptions', { params })),
  createSubscription: (payload) => unwrap(api.post('/admin/subscriptions', payload)),
  cancelSubscription: (id) => unwrap(api.patch(`/admin/subscriptions/${id}/cancel`)),
  getSubscriptionStats: () => unwrap(api.get('/admin/subscriptions/stats')),
};

export default adminService;
