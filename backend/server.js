require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// 🔒 En production, on refuse de démarrer avec des secrets JWT par défaut —
// avant, authController.js se contentait d'un console.warn() et continuait
// avec des clés publiques connues ('dev_secret_access_key'), ce qui aurait
// permis à n'importe qui de forger un token valide pour n'importe quel compte.
// En dev/test, on garde juste l'avertissement pour ne pas bloquer le travail local.
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  console.error('❌ JWT_SECRET / JWT_REFRESH_SECRET sont obligatoires en production (voir backend/.env.example). Arrêt du serveur.');
  process.exit(1);
}

// Importation des routes
const libraryRoutes = require('./src/routes/libraryRoutes');
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const revisionRoutes = require('./src/routes/revisionRoutes'); // 🟢 Révision (SM-2)
const subscriptionRoutes = require('./src/routes/subscriptionRoutes'); // 🟢 Abonnements
const hierarchyRoutes = require('./src/routes/hierarchyRoutes'); // 🟢 Arborescence académique
const paymentRoutes = require('./src/routes/paymentRoutes'); // 🟢 Paiement FedaPay

// Déclarez vos routes AVANT de lancer le serveur
app.use('/api/library', libraryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/revision', revisionRoutes);
app.use('/api', subscriptionRoutes); // expose /api/plans et /api/admin/plans|subscriptions
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api', paymentRoutes); // expose /api/subscriptions/checkout|me, /api/payments/:id, /api/webhooks/fedapay

// 🔒 Gestionnaire d'erreurs global — doit être déclaré APRÈS toutes les routes
// (Express ne le trouverait pas sinon). Évite qu'une erreur (ex: fichier trop
// gros ou type refusé par multer, origine CORS rejetée, exception non
// attrapée dans un controller) ne remonte une pile d'erreur Node brute au
// client, ou pire, ne fasse planter le process.
app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ status: 'error', message: 'Fichier trop volumineux (50 Mo maximum).' });
  }
  if (err) {
    console.error('Erreur non gérée :', err.message);
    return res.status(err.status || 400).json({ status: 'error', message: err.message || 'Une erreur est survenue.' });
  }
  next();
});

// Connexion à la base de données puis démarrage du serveur
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Moteur de révision Python attendu sur : ${process.env.PYTHON_ENGINE_URL || 'http://localhost:8000'}`);
  });
}).catch((err) => {
  console.error("Erreur de connexion à la base de données :", err);
});
