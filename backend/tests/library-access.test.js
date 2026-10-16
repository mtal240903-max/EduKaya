const path = require('path');
const Module = require('module');
const root = require('path').resolve(__dirname, '../src');

// ---- Faux modèles (aucune base de données) ----
const calls = { documentFilter: null };
const fakeChain = (result) => ({ populate() { return this; }, sort() { return this; }, then: (res) => res(result) });

const state = {
  abonnementSemestres: [],            // semestres avec abonnement actif pour l'étudiant
  matieresBySemestre: { S3: ['M_nutrition', 'M_physio'], S4: ['M_parasito'] },
};

const fakes = {
  [`${root}/models/Abonnement.js`]: { find: () => ({ distinct: async () => state.abonnementSemestres }) },
  [`${root}/models/Matiere.js`]: {
    find: (q) => ({ distinct: async () => (q.semestre.$in || []).flatMap((s) => state.matieresBySemestre[s] || []) }),
    findById: async () => ({}),
  },
  [`${root}/models/Chapitre.js`]: { findById: async () => ({}) },
  [`${root}/models/User.js`]: {},
  [`${root}/models/Document.js`]: {
    find: (filter) => { calls.documentFilter = filter; return fakeChain([]); },
  },
};

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const resolved = (() => { try { return Module._resolveFilename(request, parent); } catch { return null; } })();
  if (resolved && fakes[resolved]) return fakes[resolved];
  return origLoad.apply(this, arguments);
};

const { getDocuments } = require(`${root}/controllers/libraryController.js`);

const run = async (user, query) => {
  let out;
  const res = { status(c) { this.code = c; return this; }, json(b) { out = { code: this.code, body: b }; return this; } };
  await getDocuments({ user, query }, res);
  return out;
};

(async () => {
  let ok = true;
  const assert = (label, cond) => { console.log((cond ? 'PASS' : 'FAIL') + '  ' + label); if (!cond) ok = false; };

  // 1) Étudiant SANS abonnement → rien, et le drapeau explicatif
  state.abonnementSemestres = [];
  let r = await run({ id: 'u1', role: 'student' }, {});
  assert('étudiant sans abonnement → 0 document + aucunAbonnementActif', r.body.count === 0 && r.body.aucunAbonnementActif === true);

  // 2) Étudiant abonné au Semestre 3 → filtre limité aux matières de S3
  state.abonnementSemestres = ['S3'];
  r = await run({ id: 'u1', role: 'student' }, {});
  const inList = calls.documentFilter.matiere.$in;
  assert('étudiant abonné S3 → filtre = matières de S3 uniquement', JSON.stringify(inList) === JSON.stringify(['M_nutrition', 'M_physio']));
  assert("aucune matière de S4 dans le filtre", !inList.includes('M_parasito'));

  // 3) Étudiant abonné S3 qui FORCE ?matiere= d'un autre semestre → refusé
  calls.documentFilter = null;
  r = await run({ id: 'u1', role: 'student' }, { matiere: 'M_parasito' });
  assert('étudiant S3 demandant une matière de S4 → 0 résultat (contournement bloqué)', r.body.count === 0);
  assert('… et la base n\'est même pas interrogée', calls.documentFilter === null);

  // 4) Étudiant abonné S3 demandant une matière de S3 → autorisé
  r = await run({ id: 'u1', role: 'student' }, { matiere: 'M_nutrition' });
  assert('étudiant S3 demandant une matière de S3 → autorisé', calls.documentFilter.matiere === 'M_nutrition');

  // 5) Admin → pas de restriction d'abonnement
  state.abonnementSemestres = [];
  calls.documentFilter = null;
  r = await run({ id: 'a1', role: 'admin' }, {});
  assert('admin sans abonnement → non restreint', calls.documentFilter && calls.documentFilter.matiere === undefined);

  console.log(ok ? '\nTOUS LES TESTS PASSENT' : '\nÉCHEC');
  process.exit(ok ? 0 : 1);
})();
