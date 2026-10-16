# EduKaya — Paiement des abonnements avec FedaPay

L'étudiant peut maintenant souscrire et payer un abonnement directement dans
l'app. Plus besoin qu'un admin l'attribue manuellement (cette option reste
disponible en secours, depuis le panneau Admin Abonnements).

## ⚠️ Configuration obligatoire avant de tester

Dans `backend/.env` :
```
FEDAPAY_SECRET_KEY=sk_sandbox_...       # Dashboard FedaPay → Workbench → API Keys
FEDAPAY_ENV=sandbox                      # 'sandbox' pour tester, 'live' en prod
FEDAPAY_WEBHOOK_SECRET=wh_sandbox_...    # Dashboard FedaPay → Workbench → Webhooks → ton endpoint → "Click to reveal"
APP_PUBLIC_URL=https://ton-backend.exemple.com
```

**`APP_PUBLIC_URL` doit être une URL publique, jamais `localhost`** — c'est là que
FedaPay renvoie le navigateur après paiement, et surtout c'est l'URL où tu dois
configurer le webhook côté FedaPay (`<APP_PUBLIC_URL>/api/webhooks/fedapay`).
**En test local, utilise [ngrok](https://ngrok.com/)** (`ngrok http 5000`) et mets
l'URL ngrok générée dans `APP_PUBLIC_URL`, et configure la même URL + `/api/webhooks/fedapay`
comme endpoint webhook dans le dashboard FedaPay (section Workbench → Webhooks).

## Comment ça marche

```
Étudiant choisit un plan
        ↓
POST /api/subscriptions/checkout  →  crée une transaction FedaPay + un Paiement "en_attente"
        ↓
L'app ouvre le lien de paiement FedaPay dans le navigateur (carte, MTN, Moov...)
        ↓
L'étudiant paie                                    FedaPay confirme
        ↓                                                  ↓
Redirection cosmétique vers                    POST /api/webhooks/fedapay
/payment-return (juste un message)             (c'est LUI qui fait foi, pas la redirection)
                                                         ↓
                                          Signature vérifiée (HMAC, voir ci-dessous)
                                                         ↓
                                          Abonnement créé automatiquement
                                                         ↓
L'app interroge GET /api/payments/:id (toutes les 4s) jusqu'à voir "reussi"
        ↓
Écran de succès, l'étudiant a accès au semestre
```

**Le webhook est la seule source de vérité.** La redirection du navigateur après
paiement n'est qu'un affichage cosmétique — même si l'étudiant ferme l'app avant
la redirection, l'abonnement s'active quand même dès que FedaPay confirme le
paiement côté serveur.

## Sécurité du webhook — vérifiée contre le vrai SDK, pas devinée

J'ai installé le paquet officiel `fedapay` et lu son code source directement avant
d'écrire l'intégration (`Webhook.constructEvent`, format de signature `t=...,s=...`,
en-tête `X-FEDAPAY-SIGNATURE`) plutôt que de coder à partir de ma mémoire — un
paiement, ça ne se devine pas.

- `app.js` capture le corps brut de chaque requête (`req.rawBody`) : indispensable, la signature FedaPay est calculée sur les octets exacts reçus, pas sur l'objet JSON reparsé.
- Un webhook à la signature invalide est rejeté (400) sans aucun traitement.
- **Idempotence** : un webhook renvoyé deux fois par FedaPay ne crée pas deux abonnements (testé).
- La route `/api/webhooks/fedapay` est publique (FedaPay n'a pas de compte EduKaya) mais sa légitimité repose entièrement sur la vérification de signature, jamais sur son absence de protection.

## Tests inclus (aucun besoin de vraie clé FedaPay pour les lancer)

```bash
cd backend
node tests/webhook.test.js
```
Simule un vrai webhook signé avec le même algorithme que FedaPay (HMAC-SHA256) et vérifie :
- signature forgée → rejetée (400), aucun abonnement créé
- signature valide + transaction "approved" → abonnement créé avec le bon semestre
- rejeu du même webhook → pas de doublon (idempotence)
- transaction "declined" → paiement marqué échoué, aucun abonnement

## Ce qui n'a pas pu être testé ici

Ce sandbox n'a pas accès au réseau FedaPay (domaine non autorisé) : **impossible de
faire un vrai appel à `Transaction.create()` ou de recevoir un vrai webhook**. Le
code d'appel (`fedapayService.js`) est écrit à partir de la lecture directe du SDK
officiel (signatures de fonctions, types de retour), mais seul un test en sandbox
FedaPay réel confirmera que `generateToken()` renvoie bien `.url` tel qu'attendu.
**Fais un premier paiement de test réel avant de mettre en production**, avec une
carte de test FedaPay (fournie dans leur documentation sandbox).

## Ce qui a été volontairement laissé de côté

- **Paiement Mobile Money direct (push USSD sans navigateur)** : le SDK expose
  `transaction.sendNowWithToken(mode, token, params)`, mais je n'ai pas pu vérifier
  le format exact attendu pour `params` (numéro de téléphone, pays) à partir du
  code source seul. Plutôt que de deviner sur un flux de paiement, j'ai livré
  uniquement le flux "checkout" par navigateur, entièrement vérifié. Si tu veux le
  paiement direct par numéro Mobile Money (meilleure UX mobile, sans navigateur),
  dis-le-moi : il faudra tester le format exact contre un vrai compte sandbox FedaPay.
- Reçus/factures téléchargeables, renouvellement automatique, remboursements.

## Nouveaux fichiers

**Backend** : `models/Paiement.js`, `services/fedapayService.js`, `controllers/paymentController.js`, `routes/paymentRoutes.js`, `tests/webhook.test.js`
**Frontend** : `services/subscriptionService.js`, `screens/SubscriptionScreen.js` — accessible depuis l'accueil ("Abonnement") et depuis les écrans Bibliothèque/Révision quand aucun abonnement actif n'est détecté.
