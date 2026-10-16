const mongoose = require('mongoose');

// 🟢 Le Semestre est l'entité pivot : c'est à ce niveau que se rattacheront les
// offres d'abonnement (PlanAbonnement) et donc le contrôle d'accès aux contenus.
const semestreSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  niveau: { type: mongoose.Schema.Types.ObjectId, ref: 'Niveau', required: true },
  actif: { type: Boolean, default: true }
}, {
  timestamps: true
});

semestreSchema.index({ nom: 1, niveau: 1 }, { unique: true });

module.exports = mongoose.model('Semestre', semestreSchema);
