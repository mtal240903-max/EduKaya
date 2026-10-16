const mongoose = require('mongoose');

const matiereSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  semestre: { type: mongoose.Schema.Types.ObjectId, ref: 'Semestre', required: true },
  actif: { type: Boolean, default: true }
}, {
  timestamps: true
});

matiereSchema.index({ nom: 1, semestre: 1 }, { unique: true });

module.exports = mongoose.model('Matiere', matiereSchema);
