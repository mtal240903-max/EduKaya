// Échappe les caractères spéciaux d'une regex avant de l'injecter dans une
// requête Mongo ($regex). Sans ça, une recherche utilisateur comme
// "(a+)+b" peut déclencher un ReDoS (déni de service par backtracking
// catastrophique), et des métacaractères non voulus (., *, |, ...) changent
// silencieusement le sens de la recherche.
function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
