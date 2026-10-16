const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware d'authentification (vérifie le token JWT)
const protect = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    if (!token || !token.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Non autorisé, token manquant' });
    }

    const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'dev_secret_access_key');
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Utilisateur introuvable' });
    }

    if (req.user.banni) {
      return res.status(403).json({ status: 'error', message: 'Ce compte a été suspendu.' });
    }

    next();
  } catch (error) {
    res.status(401).json({ status: 'error', message: 'Token invalide' });
  }
};

// 🟢 Middleware générique de contrôle de rôle : requireRole('admin', 'super-admin')
// Remplace le duplicata qui existait entre authMiddleware.js et adminMiddleware.js
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (req.user && allowedRoles.includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({
    status: 'error',
    message: `Accès refusé : réservé aux rôles [${allowedRoles.join(', ')}].`
  });
};

// Conservés pour compatibilité avec le code existant (libraryRoutes.js les importe déjà)
const adminOnly = requireRole('admin', 'super-admin');
const superAdminOnly = requireRole('super-admin');

// 🟢 Contrôle par périmètre : passe si super-admin (accès total, toujours),
// ou si admin ET que ce scope précis lui a été attribué par un Super Admin.
const requireScope = (scope) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Non autorisé.' });
  }
  if (req.user.role === 'super-admin') return next();
  if (req.user.role === 'admin' && (req.user.adminScopes || []).includes(scope)) return next();

  return res.status(403).json({
    status: 'error',
    message: `Accès refusé : le périmètre "${scope}" ne vous a pas été attribué.`
  });
};

module.exports = { protect, adminOnly, superAdminOnly, requireRole, requireScope };
