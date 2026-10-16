const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isCloudinaryConfigured } = require('../config/cloudinary');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

// Génération des tokens JWT
// ⚠️ En production, JWT_SECRET et JWT_REFRESH_SECRET DOIVENT être définis dans le .env
// (voir .env.example). Le fallback ci-dessous évite juste un crash en dev.
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('⚠️  JWT_SECRET / JWT_REFRESH_SECRET manquants dans .env — valeurs de secours utilisées (NE PAS utiliser en production).');
}

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'dev_secret_access_key',
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'dev_secret_refresh_key',
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({
  id: user._id,
  nom: user.nom,
  email: user.email,
  niveau: user.niveau,
  filiere: user.filiere,
  avatarUrl: user.avatarUrl || null,
  role: user.role,
  adminScopes: user.adminScopes || [],
  banni: user.banni
});

// Inscription
exports.register = async (req, res) => {
  try {
    const { nom, email, password, niveau, filiere } = req.body;

    if (!nom || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'Nom, email et mot de passe sont obligatoires.' });
    }
    // 🔒 Avant, n'importe quelle chaîne non vide était acceptée comme mot de
    // passe (même "a") et comme email (même "pas-un-email") — validation
    // minimale ajoutée côté serveur (ne jamais se fier uniquement au front).
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ status: 'error', message: 'Adresse email invalide.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ status: 'error', message: 'Cet email est déjà utilisé.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      nom,
      email: email.toLowerCase(),
      password: hashedPassword,
      niveau: niveau || 'Licence 1',
      filiere: filiere || 'Production Animale'
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      status: 'success',
      message: 'Inscription réussie',
      accessToken,
      refreshToken,
      user: publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Connexion
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) {
      return res.status(400).json({ status: 'error', message: 'Identifiants invalides.' });
    }

    if (user.banni) {
      return res.status(403).json({ status: 'error', message: 'Ce compte a été suspendu.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 'error', message: 'Identifiants invalides.' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Connexion réussie',
      accessToken,
      refreshToken,
      user: publicUser(user)
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Déconnexion
exports.logout = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (userId) {
      await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }
    res.status(200).json({ status: 'success', message: 'Déconnexion réussie.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 🟢 Rafraîchissement du token d'accès (le token d'accès expire en 15 min)
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ status: 'error', message: 'Refresh token manquant.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'dev_secret_refresh_key');
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ status: 'error', message: 'Refresh token invalide.' });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.status(200).json({ status: 'success', ...tokens, user: publicUser(user) });
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'Session expirée, veuillez vous reconnecter.' });
  }
};

// 🟢 Profil de l'utilisateur connecté (utilisé par ProfileScreen)
exports.me = async (req, res) => {
  res.status(200).json({ status: 'success', user: publicUser(req.user) });
};

// 🟢 Modifier ses propres informations (nom, niveau, filière). L'email et le rôle
// ne passent jamais par cette route — changer l'un ou l'autre a des implications
// (unicité, droits) qui méritent un chemin séparé, pas un simple champ de formulaire.
exports.updateProfile = async (req, res) => {
  try {
    const { nom, niveau, filiere } = req.body;
    const updates = {};
    if (nom !== undefined) {
      if (!String(nom).trim()) {
        return res.status(400).json({ status: 'error', message: 'Le nom ne peut pas être vide.' });
      }
      updates.nom = String(nom).trim();
    }
    if (niveau !== undefined) updates.niveau = String(niveau).trim();
    if (filiere !== undefined) updates.filiere = String(filiere).trim();

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.status(200).json({ status: 'success', user: publicUser(user) });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 🟢 Changement de mot de passe — exige l'ancien mot de passe (évite qu'une
// session volée/laissée ouverte suffise à verrouiller le vrai propriétaire du
// compte hors de son propre compte).
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ status: 'error', message: 'Mot de passe actuel et nouveau mot de passe requis.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    }

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 'error', message: 'Mot de passe actuel incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    // Invalide la session courante (et toute autre) : on force une reconnexion
    // avec le nouveau mot de passe, par précaution si le compte a été compromis.
    user.refreshToken = undefined;
    await user.save();

    res.status(200).json({ status: 'success', message: 'Mot de passe modifié. Reconnecte-toi.' });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 🟢 Photo de profil — même principe que l'upload de documents (multer en
// mémoire → Cloudinary signé côté serveur, jamais depuis le client). Dossier
// Cloudinary séparé ('edukaya-avatars') pour ne pas mélanger avec les documents.
exports.updateAvatar = async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ status: 'error', message: "Upload indisponible : Cloudinary n'est pas configuré côté serveur." });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Aucune image reçue.' });
    }

    const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'edukaya-avatars',
      resource_type: 'image',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });

    const user = await User.findByIdAndUpdate(req.user.id, { avatarUrl: uploaded.secure_url }, { new: true });
    res.status(200).json({ status: 'success', user: publicUser(user) });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};
