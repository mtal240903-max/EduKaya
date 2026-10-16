const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimiters');
const sanitizeBody = require('./middleware/sanitizeBody');

const app = express();

// En-têtes de sécurité HTTP standards (anti-clickjacking, désactive
// X-Powered-By qui révèle la techno serveur, etc.).
app.use(helmet());

// Middlewares de base
//
// CORS_ALLOWED_ORIGINS (voir .env.example) : liste blanche d'origines, utile
// si un client web (back-office navigateur) est ajouté un jour. Sans effet
// sur l'app mobile, qui n'envoie pas d'en-tête Origin. Si la variable est
// absente (dev), on reste permissif pour ne pas bloquer le développement.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors(
  allowedOrigins.length > 0
    ? {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
          callback(new Error('Origine non autorisée par CORS.'));
        },
      }
    : {}
));

// Limite générale de requêtes par IP — placée avant les routes métier.
app.use(apiLimiter);
// 🟢 On garde le corps brut (Buffer) de chaque requête sur req.rawBody, en plus
// du JSON déjà parsé. Nécessaire pour vérifier la signature des webhooks FedaPay
// (HMAC calculé sur les octets exacts reçus — un objet JS re-sérialisé ne donnerait
// pas le même résultat). Coût négligeable, appliqué globalement pour rester simple.
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

// Retire les clés d'opérateur Mongo ($gt, $where, ...) du corps des requêtes
// avant qu'elles n'atteignent un controller — voir middleware/sanitizeBody.js.
app.use(sanitizeBody);

// Page statique très simple affichée dans le navigateur juste après un paiement
// FedaPay (flux "checkout" par redirection). Le vrai traitement se fait via le
// webhook, côté serveur — cette page ne sert qu'à dire à l'utilisateur de revenir
// dans l'app.
app.get('/payment-return', (req, res) => {
  const status = req.query.status || 'inconnu';
  res.send(`
    <html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
    <body style="font-family: sans-serif; text-align:center; padding: 40px; background:#070b14; color:#fff;">
      <h2>Paiement ${status === 'approved' ? 'reçu ✅' : 'en cours de traitement...'}</h2>
      <p>Tu peux fermer cette page et retourner dans l'application EduKaya.</p>
    </body></html>
  `);
});

// Route test
app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API d'EduKaya !" });
});

module.exports = app;