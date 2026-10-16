const rateLimit = require('express-rate-limit');

// Limite générale : protège l'API d'un abus/bug côté client (boucle infinie,
// scraping...) sans gêner un usage normal.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de requêtes, réessaie dans quelques minutes.' },
});

// Limite stricte sur les routes d'authentification : c'est la cible n°1 du
// brute-force (essayer plein de mots de passe sur un email connu). Sans cette
// limite, express-rate-limit était installé mais jamais appliqué nulle part.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Trop de tentatives. Réessaie dans quelques minutes.' },
  skipSuccessfulRequests: true,
});

module.exports = { apiLimiter, authLimiter };
