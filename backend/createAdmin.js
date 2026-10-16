require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

// Usage :
//   node createAdmin.js                -> crée/promeut un compte 'admin'
//   node createAdmin.js super-admin    -> crée/promeut un compte 'super-admin'
const targetRole = ['admin', 'super-admin'].includes(process.argv[2]) ? process.argv[2] : 'admin';

const emailAdmin = "mtal240903@gmail.com"; // Change par ton email
const passwordAdmin = "Chamwil240903"; // Change par ton mot de passe souhaité
const nomAdmin = "MTaL";

const createOrPromoteAdmin = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/edukaya';
    await mongoose.connect(mongoURI);
    console.log('Connexion à MongoDB réussie...');

    let user = await User.findOne({ email: emailAdmin });

    // Un admin créé via ce script (bootstrap) reçoit tous les périmètres par
    // défaut ; ajustable ensuite depuis le panneau "Administrateurs".
    const fullScopes = ['bibliotheque', 'revision', 'utilisateurs', 'abonnements'];

    if (user) {
      user.role = targetRole;
      if (targetRole === 'admin') user.adminScopes = fullScopes;
      await user.save();
      console.log(`Succès ! L'utilisateur existant (${emailAdmin}) a été promu au rôle : ${targetRole.toUpperCase()}.`);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(passwordAdmin, salt);

      user = new User({
        nom: nomAdmin,
        email: emailAdmin,
        password: hashedPassword,
        role: targetRole,
        adminScopes: targetRole === 'admin' ? fullScopes : [],
        niveau: 'Licence 3',
        filiere: 'Sciences et Techniques de Production Animale'
      });

      await user.save();
      console.log(`Succès ! Nouveau compte ${targetRole.toUpperCase()} créé avec l'email : ${emailAdmin}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la création/promotion :', error);
    process.exit(1);
  }
};

createOrPromoteAdmin();
