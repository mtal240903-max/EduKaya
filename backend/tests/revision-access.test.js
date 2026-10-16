const Module = require('module');
const root = require('path').resolve(__dirname, '../src');

const state = { abonnementSemestres: [], matieresBySemestre: { S3: ['M_nutrition'], S4: ['M_parasito'] }, questionMatiere: 'M_parasito' };
const seen = { questionFilter: null, progressSaved: false };

const chain = (result) => ({ populate() { return this; }, sort() { return this; }, limit() { return this; }, then: (r) => r(result) });

const fakes = {
  [`${root}/models/Abonnement.js`]: { find: () => ({ distinct: async () => state.abonnementSemestres }) },
  [`${root}/models/Matiere.js`]: { find: (q) => ({ distinct: async () => (q.semestre.$in || []).flatMap((s) => state.matieresBySemestre[s] || []) }) },
  [`${root}/models/Question.js`]: {
    find: (f) => { seen.questionFilter = f; return chain([]); },
    findById: async () => ({ _id: 'Q1', matiere: state.questionMatiere, reponseCorrecte: 0, explication: 'x' }),
    countDocuments: async () => 0,
  },
  [`${root}/models/RevisionProgress.js`]: (() => {
    function RP() { this.repetitions = 0; this.easeFactor = 2.5; this.interval = 0; this.totalReviews = 0; this.correctStreak = 0; this.save = async () => { seen.progressSaved = true; }; }
    RP.find = (q) => Object.assign(chain([]), { distinct: async () => [] });
    RP.findOne = async () => null;
    RP.countDocuments = async () => 0;
    return RP;
  })(),
};

const origLoad = Module._load;
Module._load = function (request, parent) {
  let resolved = null; try { resolved = Module._resolveFilename(request, parent); } catch {}
  if (resolved && fakes[resolved]) return fakes[resolved];
  return origLoad.apply(this, arguments);
};

const { getQueue, submitAnswer } = require(`${root}/controllers/revisionController.js`);
const mkRes = () => { const r = { status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } }; return r; };

(async () => {
  let ok = true;
  const assert = (l, c) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + l); if (!c) ok = false; };

  // getQueue — sans abonnement
  state.abonnementSemestres = [];
  let res = mkRes();
  await getQueue({ user: { id: 'u', role: 'student' }, query: {} }, res);
  assert('getQueue sans abonnement → file vide + aucunAbonnementActif', res.body.count === 0 && res.body.aucunAbonnementActif === true);

  // getQueue — abonné S3, demande une matière de S4
  state.abonnementSemestres = ['S3'];
  res = mkRes();
  await getQueue({ user: { id: 'u', role: 'student' }, query: { matiere: 'M_parasito' } }, res);
  assert('getQueue S3 forçant une matière de S4 → file vide', res.body.count === 0);

  // getQueue — abonné S3, sans filtre : seules les matières S3
  seen.questionFilter = null;
  res = mkRes();
  await getQueue({ user: { id: 'u', role: 'student' }, query: {} }, res);
  assert('getQueue S3 → questions limitées aux matières de S3', JSON.stringify(seen.questionFilter.matiere.$in) === JSON.stringify(['M_nutrition']));

  // submitAnswer — question d'une matière hors abonnement
  state.abonnementSemestres = ['S3']; state.questionMatiere = 'M_parasito'; seen.progressSaved = false;
  res = mkRes();
  await submitAnswer({ user: { id: 'u', role: 'student' }, body: { questionId: 'Q1', quality: 4 } }, res);
  assert('submitAnswer hors abonnement → 403', res.code === 403);
  assert('… et aucune progression enregistrée', seen.progressSaved === false);

  // submitAnswer — abonnement expiré entre-temps (plus aucun semestre accessible)
  state.abonnementSemestres = []; state.questionMatiere = 'M_nutrition';
  res = mkRes();
  await submitAnswer({ user: { id: 'u', role: 'student' }, body: { questionId: 'Q1', quality: 4 } }, res);
  assert('submitAnswer après expiration → 403', res.code === 403);

  // submitAnswer — accès valide
  state.abonnementSemestres = ['S3']; state.questionMatiere = 'M_nutrition'; seen.progressSaved = false;
  res = mkRes();
  await submitAnswer({ user: { id: 'u', role: 'student' }, body: { questionId: 'Q1', quality: 4 } }, res);
  assert('submitAnswer avec accès valide → 200 et progression enregistrée', res.code === 200 && seen.progressSaved === true);

  console.log(ok ? '\nTOUS LES TESTS PASSENT' : '\nÉCHEC');
  process.exit(ok ? 0 : 1);
})();
