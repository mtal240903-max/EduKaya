const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  // Rattachement optionnel à un document de la bibliothèque
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },

  // 🟢 Rattachement obligatoire à l'arborescence académique (plus de texte libre).
  matiere: { type: mongoose.Schema.Types.ObjectId, ref: 'Matiere', required: true },
  chapitre: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapitre' }, // optionnel

  question: { type: String, required: true, trim: true },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length >= 2,
      message: 'Une question doit avoir au moins 2 options de réponse.'
    }
  },
  reponseCorrecte: { type: Number, required: true, min: 0 }, // index dans `options`
  explication: { type: String, trim: true },

  difficulte: { type: String, enum: ['facile', 'moyen', 'difficile'], default: 'moyen' },
  actif: { type: Boolean, default: true },

  publieePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);
