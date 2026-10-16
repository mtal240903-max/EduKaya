const mongoose = require('mongoose');

const chapitreSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  matiere: { type: mongoose.Schema.Types.ObjectId, ref: 'Matiere', required: true },
  actif: { type: Boolean, default: true }
}, {
  timestamps: true
});

chapitreSchema.index({ nom: 1, matiere: 1 }, { unique: true });

module.exports = mongoose.model('Chapitre', chapitreSchema);
