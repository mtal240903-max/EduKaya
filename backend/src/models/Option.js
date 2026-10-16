const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  faculte: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculte', required: true },
  actif: { type: Boolean, default: true }
}, {
  timestamps: true
});

optionSchema.index({ nom: 1, faculte: 1 }, { unique: true });

module.exports = mongoose.model('Option', optionSchema);
