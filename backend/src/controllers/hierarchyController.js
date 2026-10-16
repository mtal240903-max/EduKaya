const Faculte = require('../models/Faculte');
const Option = require('../models/Option');
const Niveau = require('../models/Niveau');
const Semestre = require('../models/Semestre');
const Matiere = require('../models/Matiere');
const Chapitre = require('../models/Chapitre');
const { fromSemestre, fromMatiere, fromChapitre } = require('../utils/breadcrumb');

// 🟢 Un seul contrôleur pour les 6 niveaux plutôt que 6 fichiers quasi identiques.
// Chaque niveau connaît son modèle Mongoose, le nom du champ qui référence son
// parent (null pour la racine), et le niveau enfant (pour bloquer une suppression
// tant que des enfants existent encore dessous).
const LEVELS = {
  facultes:  { Model: Faculte,  parentField: null,       parentLevel: null,       childLevel: 'options' },
  options:   { Model: Option,   parentField: 'faculte',  parentLevel: 'facultes', childLevel: 'niveaux' },
  niveaux:   { Model: Niveau,   parentField: 'option',   parentLevel: 'options',  childLevel: 'semestres' },
  semestres: { Model: Semestre, parentField: 'niveau',   parentLevel: 'niveaux',  childLevel: 'matieres' },
  matieres:  { Model: Matiere,  parentField: 'semestre', parentLevel: 'semestres', childLevel: 'chapitres' },
  chapitres: { Model: Chapitre, parentField: 'matiere',  parentLevel: 'matieres', childLevel: null },
};

function resolveLevel(req, res) {
  const level = LEVELS[req.params.level];
  if (!level) {
    res.status(404).json({ status: 'error', message: `Niveau inconnu : "${req.params.level}".` });
    return null;
  }
  return level;
}

// GET /api/hierarchy/:level?parentId=...
// Sans parentId sur un niveau qui a un parent : renvoie tout (utile pour un écran plat/recherche).
exports.getLevel = async (req, res) => {
  try {
    const level = resolveLevel(req, res);
    if (!level) return;

    let filter = {};
    if (level.parentField && req.query.parentId) {
      filter[level.parentField] = req.query.parentId;
    }

    const items = await level.Model.find(filter).sort({ nom: 1 });
    res.status(200).json({ status: 'success', count: items.length, items });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// POST /api/hierarchy/:level — Body: { nom, parentId } (Super-Admin uniquement)
exports.createLevelItem = async (req, res) => {
  try {
    const level = resolveLevel(req, res);
    if (!level) return;

    const { nom, parentId } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ status: 'error', message: 'Le nom est requis.' });
    }
    if (level.parentField && !parentId) {
      return res.status(400).json({ status: 'error', message: 'parentId est requis pour ce niveau.' });
    }

    const payload = { nom: nom.trim() };
    if (level.parentField) {
      const parent = await LEVELS[level.parentLevel].Model.findById(parentId);
      if (!parent) return res.status(404).json({ status: 'error', message: 'Élément parent introuvable.' });
      payload[level.parentField] = parentId;
    }

    const item = await level.Model.create(payload);
    res.status(201).json({ status: 'success', message: 'Créé.', item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'Ce nom existe déjà à ce niveau.' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PUT /api/hierarchy/:level/:id — Body: { nom } (Super-Admin uniquement)
exports.updateLevelItem = async (req, res) => {
  try {
    const level = resolveLevel(req, res);
    if (!level) return;

    const { nom } = req.body;
    if (!nom || !nom.trim()) {
      return res.status(400).json({ status: 'error', message: 'Le nom est requis.' });
    }

    const item = await level.Model.findByIdAndUpdate(req.params.id, { nom: nom.trim() }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ status: 'error', message: 'Élément introuvable.' });

    res.status(200).json({ status: 'success', message: 'Mis à jour.', item });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'Ce nom existe déjà à ce niveau.' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PATCH /api/hierarchy/:level/:id/toggle — active/désactive (Super-Admin uniquement)
exports.toggleLevelItem = async (req, res) => {
  try {
    const level = resolveLevel(req, res);
    if (!level) return;

    const item = await level.Model.findById(req.params.id);
    if (!item) return res.status(404).json({ status: 'error', message: 'Élément introuvable.' });

    item.actif = !item.actif;
    await item.save();

    res.status(200).json({ status: 'success', message: item.actif ? 'Réactivé.' : 'Désactivé.', item });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/hierarchy/flat/:level  (level: semestres | matieres | chapitres)
// Renvoie une liste plate avec un fil d'Ariane lisible — pratique pour un sélecteur
// dans un formulaire (créer un Plan, un Document, une Question) sans faire naviguer
// l'utilisateur niveau par niveau. Ne renvoie que les éléments actifs (et dont les
// parents le sont aussi), pour ne jamais proposer de rattacher du contenu neuf à
// une branche désactivée.
exports.getFlatList = async (req, res) => {
  try {
    const { level } = req.params;

    if (level === 'semestres') {
      const semestres = await Semestre.find({ actif: true }).populate({
        path: 'niveau',
        match: { actif: true },
        populate: { path: 'option', match: { actif: true }, populate: { path: 'faculte', match: { actif: true } } }
      });
      const items = semestres
        .filter((s) => s.niveau && s.niveau.option && s.niveau.option.faculte)
        .map((s) => ({ _id: s._id, nom: s.nom, parentId: s.niveau._id, breadcrumb: fromSemestre(s) }));
      return res.status(200).json({ status: 'success', count: items.length, items });
    }

    if (level === 'matieres') {
      const matieres = await Matiere.find({ actif: true }).populate({
        path: 'semestre',
        match: { actif: true },
        populate: { path: 'niveau', populate: { path: 'option', populate: { path: 'faculte' } } }
      });
      const items = matieres
        .filter((m) => m.semestre)
        .map((m) => ({ _id: m._id, nom: m.nom, parentId: m.semestre._id, breadcrumb: fromMatiere(m) }));
      return res.status(200).json({ status: 'success', count: items.length, items });
    }

    if (level === 'chapitres') {
      const chapitres = await Chapitre.find({ actif: true }).populate({
        path: 'matiere',
        match: { actif: true },
        populate: { path: 'semestre', populate: { path: 'niveau', populate: { path: 'option', populate: { path: 'faculte' } } } }
      });
      const items = chapitres
        .filter((c) => c.matiere)
        .map((c) => ({ _id: c._id, nom: c.nom, parentId: c.matiere._id, breadcrumb: fromChapitre(c) }));
      return res.status(200).json({ status: 'success', count: items.length, items });
    }

    return res.status(404).json({ status: 'error', message: `Liste à plat non disponible pour "${level}".` });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// DELETE /api/hierarchy/:level/:id — refusé si des enfants existent encore dessous
exports.deleteLevelItem = async (req, res) => {
  try {
    const level = resolveLevel(req, res);
    if (!level) return;

    if (level.childLevel) {
      const ChildModel = LEVELS[level.childLevel].Model;
      const childField = LEVELS[level.childLevel].parentField;
      const childCount = await ChildModel.countDocuments({ [childField]: req.params.id });
      if (childCount > 0) {
        return res.status(400).json({
          status: 'error',
          message: `Impossible de supprimer : ${childCount} élément(s) existent encore en dessous. Désactive plutôt.`
        });
      }
    }

    const item = await level.Model.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ status: 'error', message: 'Élément introuvable.' });

    res.status(200).json({ status: 'success', message: 'Supprimé.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
