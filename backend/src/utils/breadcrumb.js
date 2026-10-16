// Construit un fil d'Ariane lisible à partir d'un Semestre peuplé jusqu'à la racine.
// Attend un document Semestre avec .niveau.option.faculte peuplés (populate en cascade).
function fromSemestre(semestre) {
  if (!semestre) return '';
  const niveau = semestre.niveau;
  const option = niveau?.option;
  const faculte = option?.faculte;
  return [faculte?.nom, option?.nom, niveau?.nom, semestre.nom].filter(Boolean).join(' > ');
}

// Idem à partir d'une Matière peuplée (.semestre.niveau.option.faculte)
function fromMatiere(matiere) {
  if (!matiere) return '';
  return [fromSemestre(matiere.semestre), matiere.nom].filter(Boolean).join(' > ');
}

// Idem à partir d'un Chapitre peuplé (.matiere.semestre.niveau.option.faculte)
function fromChapitre(chapitre) {
  if (!chapitre) return '';
  return [fromMatiere(chapitre.matiere), chapitre.nom].filter(Boolean).join(' > ');
}

module.exports = { fromSemestre, fromMatiere, fromChapitre };
