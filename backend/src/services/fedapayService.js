const { FedaPay, Transaction, Webhook } = require('fedapay');

// ⚠️ FEDAPAY_ENV doit être 'sandbox' pour tester, 'live' en production.
FedaPay.setApiKey(process.env.FEDAPAY_SECRET_KEY || '');
FedaPay.setEnvironment(process.env.FEDAPAY_ENV || 'sandbox');

if (!process.env.FEDAPAY_SECRET_KEY) {
  console.warn('⚠️  FEDAPAY_SECRET_KEY manquant dans .env — les paiements échoueront tant qu\'il n\'est pas renseigné.');
}

// Crée une transaction FedaPay pour un plan donné, puis génère le lien de paiement
// hébergé par FedaPay (page "checkout" : carte, Mobile Money MTN/Moov, etc. — tout
// est géré par FedaPay lui-même, on n'a pas à gérer chaque moyen de paiement ici).
//
// Renvoie { transactionId, checkoutUrl }. Le paiement n'est PAS confirmé à ce
// stade : seul le webhook (voir paymentController.handleWebhook) fait foi.
async function createCheckoutTransaction({ user, plan, callbackUrl }) {
  const [firstname, ...rest] = (user.nom || 'Utilisateur').trim().split(' ');
  const lastname = rest.join(' ') || '.';

  const transaction = await Transaction.create({
    description: `Abonnement "${plan.nom}" — EduKaya`,
    amount: plan.prix,
    currency: { iso: plan.devise || 'XOF' },
    callback_url: callbackUrl,
    customer: {
      firstname,
      lastname,
      email: user.email,
    },
  });

  const tokenObj = await transaction.generateToken();

  return { transactionId: transaction.id, checkoutUrl: tokenObj.url };
}

// Vérifie la signature d'un webhook FedaPay et renvoie l'événement décodé.
// Lève une erreur si la signature est invalide (payload altéré, mauvais secret,
// ou requête ne venant pas réellement de FedaPay) — ne JAMAIS traiter un webhook
// dont la signature n'a pas été vérifiée avec succès.
function verifyWebhookSignature(rawBody, signatureHeader) {
  return Webhook.constructEvent(rawBody, signatureHeader, process.env.FEDAPAY_WEBHOOK_SECRET);
}

module.exports = { createCheckoutTransaction, verifyWebhookSignature };
