const Plan = require('../models/Plan');
const Paiement = require('../models/Paiement');
const Abonnement = require('../models/Abonnement');
const { createCheckoutTransaction, verifyWebhookSignature } = require('../services/fedapayService');

const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || 'http://localhost:5000';

/* =======================================================
   CHECKOUT (étudiant)
======================================================= */

// POST /api/subscriptions/checkout   Body: { planId }
exports.startCheckout = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ status: 'error', message: 'planId est requis.' });

    const plan = await Plan.findById(planId);
    if (!plan || !plan.actif) {
      return res.status(404).json({ status: 'error', message: 'Ce plan est introuvable ou n\'est plus disponible.' });
    }

    const { transactionId, checkoutUrl } = await createCheckoutTransaction({
      user: req.user,
      plan,
      callbackUrl: `${APP_PUBLIC_URL}/payment-return`
    });

    const paiement = await Paiement.create({
      user: req.user.id,
      plan: plan._id,
      montant: plan.prix,
      devise: plan.devise,
      fedapayTransactionId: transactionId,
      statut: 'en_attente',
      methode: 'checkout'
    });

    res.status(201).json({ status: 'success', paiementId: paiement._id, checkoutUrl });
  } catch (error) {
    console.error('Erreur FedaPay checkout :', error.message);
    res.status(500).json({ status: 'error', message: "Impossible de démarrer le paiement pour le moment." });
  }
};

// GET /api/payments/:id — l'app interroge ce statut après le retour du navigateur
exports.getPaymentStatus = async (req, res) => {
  try {
    const paiement = await Paiement.findById(req.params.id).populate('plan', 'nom prix devise');
    if (!paiement) return res.status(404).json({ status: 'error', message: 'Paiement introuvable.' });
    if (paiement.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Accès refusé.' });
    }

    res.status(200).json({
      status: 'success',
      statut: paiement.statut,
      plan: paiement.plan,
      montant: paiement.montant,
      devise: paiement.devise
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/subscriptions/me — les abonnements de l'utilisateur connecté
exports.getMySubscriptions = async (req, res) => {
  try {
    await Abonnement.updateMany(
      { user: req.user.id, statut: 'actif', dateFin: { $lt: new Date() } },
      { $set: { statut: 'expire' } }
    );

    const abonnements = await Abonnement.find({ user: req.user.id })
      .populate({ path: 'plan', select: 'nom prix devise' })
      .populate({ path: 'semestre', populate: { path: 'niveau', populate: { path: 'option', populate: { path: 'faculte' } } } })
      .sort({ createdAt: -1 });

    const { fromSemestre } = require('../utils/breadcrumb');
    res.status(200).json({
      status: 'success',
      count: abonnements.length,
      subscriptions: abonnements.map((a) => ({ ...a.toObject(), semestreBreadcrumb: fromSemestre(a.semestre) }))
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/* =======================================================
   WEBHOOK FEDAPAY — source de vérité pour l'activation
======================================================= */

// POST /api/webhooks/fedapay
// ⚠️ Route publique (pas de token utilisateur — FedaPay ne peut pas s'authentifier
// comme un utilisateur EduKaya) mais protégée par la vérification de signature
// ci-dessous. Ne JAMAIS activer un abonnement sans cette vérification.
exports.handleWebhook = async (req, res) => {
  const signature = req.headers['x-fedapay-signature'];

  let event;
  try {
    event = verifyWebhookSignature(req.rawBody, signature);
  } catch (error) {
    console.error('Signature webhook FedaPay invalide :', error.message);
    return res.status(400).json({ status: 'error', message: 'Signature invalide.' });
  }

  // On répond vite (voir doc FedaPay : "Respond Quickly with a 2xx Status") — le
  // traitement ci-dessous reste rapide (quelques requêtes Mongo), donc synchrone.
  try {
    const entity = event.entity || {};
    const paiement = await Paiement.findOne({ fedapayTransactionId: entity.id });

    if (!paiement) {
      // Transaction inconnue de nous (jamais démarrée via /checkout, ou déjà nettoyée) :
      // on répond quand même 200 pour ne pas déclencher de réessais infinis de FedaPay.
      return res.status(200).json({ received: true });
    }

    paiement.dernierWebhook = event;

    // 🟢 On se fie au statut réel de la transaction (entity.status), pas au nom de
    // l'événement — plus robuste si l'intitulé exact de l'événement diffère selon
    // la version de l'API. Statuts FedaPay : pending | approved | declined | canceled | refunded | transferred.
    if (entity.status === 'approved') {
      // Idempotence : un webhook peut être renvoyé plusieurs fois par FedaPay en cas
      // de doute sur la réception — ne jamais créer deux fois le même abonnement.
      if (paiement.statut !== 'reussi') {
        const plan = await Plan.findById(paiement.plan);
        const dateDebut = new Date();
        const dateFin = new Date(dateDebut.getTime() + plan.dureeJours * 24 * 60 * 60 * 1000);

        const abonnement = await Abonnement.create({
          user: paiement.user,
          plan: plan._id,
          semestre: plan.semestre,
          dateDebut,
          dateFin,
          statut: 'actif'
        });

        paiement.statut = 'reussi';
        paiement.abonnement = abonnement._id;
      }
    } else if (['declined', 'canceled'].includes(entity.status)) {
      paiement.statut = entity.status === 'declined' ? 'echoue' : 'annule';
    }
    // Les autres statuts (pending, refunded, transferred) ne changent pas paiement.statut ici.

    await paiement.save();
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erreur traitement webhook FedaPay :', error.message);
    // On répond quand même 200 : l'erreur est de notre côté, pas la faute de FedaPay,
    // et on ne veut pas d'une boucle de réessais infinie pour un bug qui persistera.
    res.status(200).json({ received: true, error: 'internal' });
  }
};
