const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { startCheckout, getPaymentStatus, getMySubscriptions, handleWebhook } = require('../controllers/paymentController');

// 🟢 Route PUBLIQUE (pas de protect) : FedaPay ne porte pas de token utilisateur.
// Sa légitimité est garantie uniquement par la vérification de signature à
// l'intérieur de handleWebhook — jamais par une simple absence de restriction.
router.post('/webhooks/fedapay', handleWebhook);

// Routes étudiant, authentification requise
router.post('/subscriptions/checkout', protect, startCheckout);
router.get('/payments/:id', protect, getPaymentStatus);
router.get('/subscriptions/me', protect, getMySubscriptions);

module.exports = router;
