const mongoose = require('mongoose');

// État de répétition espacée (SM-2) d'un utilisateur sur une question donnée.
// Une ligne = une paire (utilisateur, question), créée au premier passage.
const revisionProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },

  repetitions: { type: Number, default: 0 },
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 }, // en jours
  nextReviewDate: { type: Date, default: Date.now }, // due immédiatement tant que jamais révisée

  lastQuality: { type: Number },
  lastReviewedAt: { type: Date },
  totalReviews: { type: Number, default: 0 },
  correctStreak: { type: Number, default: 0 },
  mastered: { type: Boolean, default: false }
}, {
  timestamps: true
});

revisionProgressSchema.index({ user: 1, question: 1 }, { unique: true });
revisionProgressSchema.index({ user: 1, nextReviewDate: 1 });

module.exports = mongoose.model('RevisionProgress', revisionProgressSchema);
