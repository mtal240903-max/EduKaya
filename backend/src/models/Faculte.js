const mongoose = require('mongoose');

// Racine de l'arborescence académique. Gérée exclusivement par le Super Admin
// (voir requireRole('super-admin') dans hierarchyRoutes.js).
const faculteSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true, unique: true },
  actif: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Faculte', faculteSchema);
