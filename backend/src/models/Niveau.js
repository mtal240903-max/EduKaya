const mongoose = require('mongoose');

const niveauSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  option: { type: mongoose.Schema.Types.ObjectId, ref: 'Option', required: true },
  actif: { type: Boolean, default: true }
}, {
  timestamps: true
});

niveauSchema.index({ nom: 1, option: 1 }, { unique: true });

module.exports = mongoose.model('Niveau', niveauSchema);
