const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // 🟢 Un abonnement ne donne accès qu'à CE semestre précis, jamais à toute la plateforme.
  semestre: { type: mongoose.Schema.Types.ObjectId, ref: 'Semestre', required: true },
  prix: { type: Number, required: true, min: 0 },
  devise: { type: String, default: 'XOF' }, // Franc CFA par défaut
  dureeJours: { type: Number, required: true, min: 1 }, // durée d'un cycle (ex: 30 = mensuel)
  fonctionnalites: { type: [String], default: [] },
  actif: { type: Boolean, default: true }, // un plan désactivé n'est plus proposé aux étudiants
  creePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Plan', planSchema);
