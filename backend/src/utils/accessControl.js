const Abonnement = require('../models/Abonnement');
const Matiere = require('../models/Matiere');
const Semestre = require('../models/Semestre');
const Plan = require('../models/Plan');

// 🟢 Un semestre n'est payant QUE si un admin lui a assigné au moins un plan
// d'abonnement. Tant qu'aucun plan n'existe pour lui, il reste accessible à
// tous les étudiants (comportement "ouvert par défaut"). Dès qu'un premier
// plan est créé pour ce semestre, celui-ci bascule en accès payant et seuls
// les étudiants avec un abonnement actif y accèdent.
async function getFreeSemestreIds() {
  const semestresAvecPlan = await Plan.find({}).distinct('semestre');
  const semestresPayantsIds = semestresAvecPlan.map((id) => id.toString());

  const tousLesSemestres = await Semestre.find({}).distinct('_id');
  return tousLesSemestres
    .map((id) => id.toString())
    .filter((id) => !semestresPayantsIds.includes(id));
}

// 🟢 Fonction centrale de sécurité : renvoie la liste des Semestres auxquels
// cet utilisateur a accès en ce moment précis — soit parce que le semestre est
// encore libre (aucun plan jamais assigné), soit parce qu'il a un abonnement
// ACTIF dessus. Les abonnements sont vérifiés directement en base (dateFin >=
// maintenant, statut jamais 'annule') plutôt que de faire confiance à un champ
// 'statut' qui pourrait être obsolète (mise à jour paresseuse ailleurs) — c'est
// la porte d'entrée de sécurité, elle doit être exacte.
async function getAccessibleSemestreIds(userId) {
  const [freeSemestreIds, abonnements] = await Promise.all([
    getFreeSemestreIds(),
    Abonnement.find({
      user: userId,
      statut: { $ne: 'annule' },
      dateFin: { $gte: new Date() }
    }).distinct('semestre')
  ]);

  const abonnesIds = abonnements.map((id) => id.toString());
  return Array.from(new Set([...freeSemestreIds, ...abonnesIds]));
}

// Pratique pour filtrer une liste de Document/Question par leur `matiere` (ref) :
// renvoie les IDs de Matiere qui appartiennent à un semestre accessible.
async function getAccessibleMatiereIds(userId) {
  const semestreIds = await getAccessibleSemestreIds(userId);
  if (semestreIds.length === 0) return [];
  return (await Matiere.find({ semestre: { $in: semestreIds } }).distinct('_id')).map((id) => id.toString());
}

async function hasAccessToSemestre(userId, semestreId) {
  const ids = await getAccessibleSemestreIds(userId);
  return ids.includes(semestreId.toString());
}

module.exports = { getFreeSemestreIds, getAccessibleSemestreIds, getAccessibleMatiereIds, hasAccessToSemestre };
