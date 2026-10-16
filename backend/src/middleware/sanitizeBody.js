// Retire récursivement toute clé commençant par '$' ou contenant '.' d'un
// objet envoyé par le client (req.body, req.params). Ce sont les deux leviers
// classiques d'injection d'opérateur MongoDB (ex: { "email": { "$gt": "" } }
// pour contourner un filtre, ou { "$where": "..." } pour exécuter du code).
// Mongoose échappe déjà pas mal de choses via les schémas, mais les champs
// utilisés tels quels dans un filter (recherche, etc.) ne passent pas par un
// schéma — donc on nettoie à l'entrée, une fois pour toutes.
function stripOperators(value) {
  if (Array.isArray(value)) {
    return value.map(stripOperators);
  }
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      clean[key] = stripOperators(val);
    }
    return clean;
  }
  return value;
}

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = stripOperators(req.body);
  }
  next();
};

module.exports = sanitizeBody;
