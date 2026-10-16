const mongoose = require('mongoose');

const abonnementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },

  // 🟢 Copié depuis plan.semestre au moment de la souscription. Dénormalisé
  // volontairement : même si le plan est modifié/supprimé plus tard, l'accès
  // déjà accordé reste vérifiable directement sur l'abonnement lui-même.
  semestre: { type: mongoose.Schema.Types.ObjectId, ref: 'Semestre', required: true },

  dateDebut: { type: Date, default: Date.now },
  dateFin: { type: Date, required: true },
  statut: { type: String, enum: ['actif', 'expire', 'annule'], default: 'actif' },

  assignePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // l'admin qui a créé l'abonnement
}, {
  timestamps: true
});

abonnementSchema.index({ user: 1, statut: 1 });

module.exports = mongoose.model('Abonnement', abonnementSchema);
