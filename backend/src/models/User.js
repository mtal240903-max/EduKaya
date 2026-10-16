const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  niveau: { type: String, default: 'Licence 3' },
  filiere: { type: String, default: 'Sciences et Techniques de Production Animale' },
  avatarUrl: { type: String }, // photo de profil (Cloudinary), optionnelle

  // 🟢 Ajout du rôle 'super-admin' en plus de 'student' et 'admin'
  role: { type: String, enum: ['student', 'admin', 'super-admin'], default: 'student' },

  // 🟢 Périmètres d'un administrateur spécialisé. Ignoré si role === 'super-admin'
  // (le Super Admin a tout, par définition). Un 'admin' fraîchement créé/promu
  // démarre avec [] tant qu'un Super Admin ne lui attribue pas de scope.
  adminScopes: {
    type: [String],
    enum: ['bibliotheque', 'revision', 'utilisateurs', 'abonnements'],
    default: []
  },

  // 🟢 Modération : permet de suspendre un compte sans le supprimer
  banni: { type: Boolean, default: false },

  // Tableau des documents favoris pour la bibliothèque
  favoris: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  refreshToken: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
