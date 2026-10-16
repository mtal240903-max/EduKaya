const crypto = require('crypto');
const Module = require('module');
const root = require('path').resolve(__dirname, '../src');
process.env.FEDAPAY_WEBHOOK_SECRET = 'wh_test_secret';

const state = { paiement: null, abonnementCreated: null };

const fakes = {
  [`${root}/models/Plan.js`]: { findById: async () => ({ _id: 'PLAN1', dureeJours: 30, semestre: 'SEM1' }) },
  [`${root}/models/Paiement.js`]: {
    findOne: async ({ fedapayTransactionId }) => {
      if (fedapayTransactionId !== 999) return null;
      return state.paiement;
    },
  },
  [`${root}/models/Abonnement.js`]: {
    create: async (data) => { state.abonnementCreated = data; return { _id: 'ABO1', ...data }; },
  },
  [`${root}/utils/breadcrumb.js`]: { fromSemestre: () => '' },
};

const origLoad = Module._load;
Module._load = function (request, parent) {
  let resolved = null; try { resolved = Module._resolveFilename(request, parent); } catch {}
  if (resolved && fakes[resolved]) return fakes[resolved];
  return origLoad.apply(this, arguments);
};

const { handleWebhook } = require(`${root}/controllers/paymentController.js`);
const { Webhook } = require('fedapay');

const mkRes = () => ({ status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });

const sign = (payloadStr, secret, timestamp) => {
  const sig = crypto.createHmac('sha256', secret).update(`${timestamp}.${payloadStr}`, 'utf8').digest('hex');
  return `t=${timestamp},s=${sig}`;
};

(async () => {
  let ok = true;
  const assert = (l, c) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + l); if (!c) ok = false; };

  // Paiement en attente, correspondant à la transaction FedaPay #999
  state.paiement = { user: 'U1', plan: 'PLAN1', statut: 'en_attente', save: async function () { this._saved = true; } };

  // ---- 1) Webhook avec une signature FORGÉE (mauvais secret) → doit être rejeté ----
  const payload1 = JSON.stringify({ entity: { id: 999, status: 'approved' } });
  const badHeader = sign(payload1, 'un_mauvais_secret', Math.floor(Date.now() / 1000));
  let res = mkRes();
  await handleWebhook({ rawBody: Buffer.from(payload1), headers: { 'x-fedapay-signature': badHeader } }, res);
  assert('signature forgée → 400 rejeté, aucun abonnement créé', res.code === 400 && state.abonnementCreated === null);

  // ---- 2) Webhook correctement signé, transaction "approved" → active l'abonnement ----
  const goodHeader = sign(payload1, process.env.FEDAPAY_WEBHOOK_SECRET, Math.floor(Date.now() / 1000));
  res = mkRes();
  await handleWebhook({ rawBody: Buffer.from(payload1), headers: { 'x-fedapay-signature': goodHeader } }, res);
  assert('signature valide + approved → 200', res.code === 200);
  assert('… abonnement créé avec le bon user/plan/semestre', state.abonnementCreated &&
    state.abonnementCreated.user === 'U1' && state.abonnementCreated.plan === 'PLAN1' && state.abonnementCreated.semestre === 'SEM1');
  assert('… paiement marqué "reussi"', state.paiement.statut === 'reussi');

  // ---- 3) Rejeu du MÊME webhook (idempotence) → ne doit pas créer un 2e abonnement ----
  state.abonnementCreated = null;
  res = mkRes();
  await handleWebhook({ rawBody: Buffer.from(payload1), headers: { 'x-fedapay-signature': goodHeader } }, res);
  assert('rejeu du webhook déjà traité → aucun nouvel abonnement (idempotence)', state.abonnementCreated === null && res.code === 200);

  // ---- 4) Transaction déclinée → paiement marqué échoué, pas d'abonnement ----
  state.paiement = { user: 'U1', plan: 'PLAN1', statut: 'en_attente', save: async function () { this._saved = true; } };
  state.abonnementCreated = null;
  const payload2 = JSON.stringify({ entity: { id: 999, status: 'declined' } });
  const header2 = sign(payload2, process.env.FEDAPAY_WEBHOOK_SECRET, Math.floor(Date.now() / 1000));
  res = mkRes();
  await handleWebhook({ rawBody: Buffer.from(payload2), headers: { 'x-fedapay-signature': header2 } }, res);
  assert('transaction "declined" → paiement "echoue", pas d\'abonnement', state.paiement.statut === 'echoue' && state.abonnementCreated === null);

  console.log(ok ? '\nTOUS LES TESTS PASSENT' : '\nÉCHEC');
  process.exit(ok ? 0 : 1);
})();
