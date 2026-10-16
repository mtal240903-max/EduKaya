const mongoose = require('mongoose');

// Trace chaque tentative de paiement FedaPay, du démarrage jusqu'à la confirmation
// (ou l'échec) reçue par webhook. C'est cette table qui fait le lien entre une
// transaction FedaPay et l'Abonnement qu'elle active une fois payée.
const paiementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },

  montant: { type: Number, required: true },
  devise: { type: String, default: 'XOF' },

  fedapayTransactionId: { type: Number, required: true, unique: true },
  statut: { type: String, enum: ['en_attente', 'reussi', 'echoue', 'annule'], default: 'en_attente' },
  methode: { type: String, default: 'checkout' },

  // Rempli une fois le paiement confirmé et l'abonnement effectivement créé
  abonnement: { type: mongoose.Schema.Types.ObjectId, ref: 'Abonnement' },

  // Dernier payload webhook reçu, conservé pour le débogage sans jamais être exposé au client
  dernierWebhook: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

module.exports = mongoose.model('Paiement', paiementSchema);
