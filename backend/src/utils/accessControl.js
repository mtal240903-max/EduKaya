const Abonnement = require('../models/Abonnement');
const Matiere = require('../models/Matiere');

// 🟢 Fonction centrale de sécurité : renvoie la liste des Semestres auxquels
// cet utilisateur a un accès ACTIF en ce moment précis. Vérifie directement en
// base (dateFin >= maintenant, statut jamais 'annule') plutôt que de faire
// confiance à un champ 'statut' qui pourrait être obsolète (mise à jour paresseuse
// ailleurs) — c'est la porte d'entrée de sécurité, elle doit être exacte.
async function getAccessibleSemestreIds(userId) {
  const abonnements = await Abonnement.find({
    user: userId,
    statut: { $ne: 'annule' },
    dateFin: { $gte: new Date() }
  }).distinct('semestre');

  return abonnements.map((id) => id.toString());
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

module.exports = { getAccessibleSemestreIds, getAccessibleMatiereIds, hasAccessToSemestre };
