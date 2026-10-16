const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  titre: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  auteur: { type: String, trim: true },

  // 🟢 Rattachement obligatoire à l'arborescence académique (plus de texte libre).
  // Le semestre/niveau/option/faculté se déduisent en remontant matiere.semestre.
  matiere: { type: mongoose.Schema.Types.ObjectId, ref: 'Matiere', required: true },
  chapitre: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapitre' }, // optionnel

  // 'categorie' reste du texte libre : ce n'est pas un niveau académique mais un
  // type de ressource (Cours, TD, Exercice, Examen...).
  categorie: { type: String, required: true, trim: true },
  annee: { type: Number },
  taille: { type: Number, required: true },
  url: { type: String, required: true },
  miniature: { type: String },
  statut: { type: String, enum: ['actif', 'archive'], default: 'actif' },
  droitsAcces: [{ type: String }],

  // 🟢 Traçabilité pour la modération (qui a publié / validé le document)
  publiePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
