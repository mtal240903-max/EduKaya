const express = require('express');
const router = express.Router();
const { protect, requireScope } = require('../middleware/authMiddleware');
const {
  getPublicPlans,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getSubscriptions,
  createSubscription,
  cancelSubscription,
  getSubscriptionStats
} = require('../controllers/subscriptionController');

router.use(protect);

// Visible par tout utilisateur connecté (ex: futur écran "Mon abonnement" côté étudiant)
router.get('/plans', getPublicPlans);

// Réservé au scope 'abonnements' (ou super-admin, via requireScope)
router.get('/admin/plans', requireScope('abonnements'), getAllPlans);
router.post('/admin/plans', requireScope('abonnements'), createPlan);
router.put('/admin/plans/:id', requireScope('abonnements'), updatePlan);
router.delete('/admin/plans/:id', requireScope('abonnements'), deletePlan);

router.get('/admin/subscriptions', requireScope('abonnements'), getSubscriptions);
router.post('/admin/subscriptions', requireScope('abonnements'), createSubscription);
router.patch('/admin/subscriptions/:id/cancel', requireScope('abonnements'), cancelSubscription);
router.get('/admin/subscriptions/stats', requireScope('abonnements'), getSubscriptionStats);

module.exports = router;
