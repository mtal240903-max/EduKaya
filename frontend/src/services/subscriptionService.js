import api from './api';

const unwrap = (promise) =>
  promise.then((res) => res.data).catch((error) => {
    throw error.response?.data || { message: 'Erreur réseau.' };
  });

export const subscriptionService = {
  getPlans: () => unwrap(api.get('/plans')),
  getMySubscriptions: () => unwrap(api.get('/subscriptions/me')),
  startCheckout: (planId) => unwrap(api.post('/subscriptions/checkout', { planId })),
  getPaymentStatus: (paiementId) => unwrap(api.get(`/payments/${paiementId}`)),
};

export default subscriptionService;
