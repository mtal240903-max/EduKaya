const Document = require('../models/Document');
const Matiere = require('../models/Matiere');
const Chapitre = require('../models/Chapitre');
const User = require('../models/User');
const { getAccessibleMatiereIds } = require('../utils/accessControl');
const { fromMatiere, fromChapitre } = require('../utils/breadcrumb');
const { escapeRegex } = require('../utils/escapeRegex');
const { isCloudinaryConfigured } = require('../config/cloudinary');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

// Peuple la chaîne complète (matiere → semestre → niveau → option → faculte) pour
// l'affichage, et attache une chaîne 'breadcrumb' lisible directement dans la réponse.
const MATIERE_CHAIN = {
  path: 'matiere',
  populate: { path: 'semestre', populate: { path: 'niveau', populate: { path: 'option', populate: { path: 'faculte' } } } }
};
// Matière (avec toute sa chaîne parente) + chapitre optionnel
const HIERARCHY_POPULATE = [MATIERE_CHAIN, { path: 'chapitre' }];

function withBreadcrumb(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.matiereBreadcrumb = fromMatiere(obj.matiere);
  if (obj.chapitre) obj.chapitreBreadcrumb = fromChapitre({ ...obj.chapitre, matiere: obj.matiere });
  return obj;
}

// Récupérer les documents accessibles, avec filtres optionnels.
// 🟢 Contrôle d'accès serveur : un étudiant ne voit QUE les documents dont la
// matière appartient à un semestre où il a un abonnement actif. Ce n'est jamais
// juste un filtre d'affichage côté app — voir §8/§20 de la spec validée.
exports.getDocuments = async (req, res) => {
  try {
    const { matiere, chapitre, categorie, search } = req.query;
    let filter = { statut: 'actif' };

    if (matiere) filter.matiere = matiere;
    if (chapitre) filter.chapitre = chapitre;
    if (categorie) filter.categorie = categorie;

    if (search) {
      filter.$or = [
        { titre: { $regex: escapeRegex(search), $options: 'i' } },
        { description: { $regex: escapeRegex(search), $options: 'i' } },
        { auteur: { $regex: escapeRegex(search), $options: 'i' } }
      ];
    }

    // Les admins/super-admin voient tout ce qui est actif ; un étudiant est
    // restreint aux matières couvertes par un abonnement en cours.
    if (req.user.role === 'student') {
      const accessibleMatiereIds = await getAccessibleMatiereIds(req.user.id);
      if (accessibleMatiereIds.length === 0) {
        return res.status(200).json({ status: 'success', count: 0, documents: [], aucunAbonnementActif: true });
      }
      filter.matiere = filter.matiere
        ? (accessibleMatiereIds.includes(filter.matiere) ? filter.matiere : null) // matière demandée hors accès
        : { $in: accessibleMatiereIds };
      if (filter.matiere === null) {
        return res.status(200).json({ status: 'success', count: 0, documents: [] });
      }
    }

    const documents = await Document.find(filter).populate(HIERARCHY_POPULATE).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', count: documents.length, documents: documents.map(withBreadcrumb) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).populate(HIERARCHY_POPULATE);
    if (!document || document.statut !== 'actif') {
      return res.status(404).json({ status: 'error', message: 'Document introuvable.' });
    }

    if (req.user.role === 'student') {
      const accessibleMatiereIds = await getAccessibleMatiereIds(req.user.id);
      if (!document.matiere || !accessibleMatiereIds.includes(document.matiere._id.toString())) {
        return res.status(403).json({ status: 'error', message: "Vous n'avez pas d'abonnement actif pour ce semestre." });
      }
    }

    res.status(200).json({ status: 'success', document: withBreadcrumb(document) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const documentId = req.params.id;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ status: 'error', message: 'Utilisateur introuvable.' });

    const index = user.favoris.indexOf(documentId);
    let isFavorite = false;

    if (index > -1) {
      user.favoris.splice(index, 1);
    } else {
      user.favoris.push(documentId);
      isFavorite = true;
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: isFavorite ? 'Document ajouté aux favoris' : 'Document retiré des favoris',
      isFavorite,
      favoris: user.favoris
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getFavoriteDocuments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({ path: 'favoris', populate: HIERARCHY_POPULATE });
    if (!user) return res.status(404).json({ status: 'error', message: 'Utilisateur introuvable.' });

    // Un document favori dont l'abonnement a expiré depuis ne doit plus remonter ici.
    let documents = user.favoris;
    if (req.user.role === 'student') {
      const accessibleMatiereIds = await getAccessibleMatiereIds(req.user.id);
      documents = documents.filter((d) => d.matiere && accessibleMatiereIds.includes(d.matiere._id.toString()));
    }

    res.status(200).json({ status: 'success', count: documents.length, documents: documents.map(withBreadcrumb) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

async function validateHierarchyRefs({ matiere, chapitre }) {
  const matiereDoc = await Matiere.findById(matiere);
  if (!matiereDoc) throw new Error('Matière introuvable — sélectionne-la depuis la liste.');
  if (chapitre) {
    const chapitreDoc = await Chapitre.findById(chapitre);
    if (!chapitreDoc) throw new Error('Chapitre introuvable.');
    if (chapitreDoc.matiere.toString() !== matiere) {
      throw new Error("Ce chapitre n'appartient pas à la matière sélectionnée.");
    }
  }
}

// (Admin, scope bibliotheque) Ajouter un nouveau document
exports.createDocument = async (req, res) => {
  try {
    const { titre, description, auteur, matiere, chapitre, categorie, annee, taille, url, miniature, droitsAcces } = req.body;

    if (!matiere) {
      return res.status(400).json({ status: 'error', message: 'La matière est requise (sélectionne-la dans la liste).' });
    }
    await validateHierarchyRefs({ matiere, chapitre });

    const newDocument = await Document.create({
      titre, description, auteur, matiere, chapitre, categorie,
      annee, taille, url, miniature, droitsAcces,
      publiePar: req.user.id
    });

    res.status(201).json({ status: 'success', message: 'Document ajouté avec succès', document: newDocument });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// (Admin, scope bibliotheque) Upload + création en une seule étape, exécutés
// entièrement côté serveur.
//
// 🔒 Remplace l'ancien flux où l'app mobile uploadait directement sur
// Cloudinary avec un "unsigned preset" embarqué dans le bundle — n'importe qui
// pouvait alors extraire ce preset de l'APK et uploader des fichiers sur le
// compte Cloudinary sans jamais passer par un compte admin EduKaya. Ici,
// l'upload est signé avec la clé secrète Cloudinary (jamais envoyée au
// client) et la route elle-même exige un JWT admin + le scope 'bibliotheque'
// (voir libraryRoutes.js) — donc protégée à deux niveaux.
exports.uploadDocument = async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        status: 'error',
        message: "Upload indisponible : Cloudinary n'est pas configuré côté serveur (voir backend/.env.example)."
      });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'Aucun fichier reçu.' });
    }

    const { titre, description, auteur, matiere, chapitre, categorie, annee, miniature, droitsAcces } = req.body;

    if (!titre || !matiere || !categorie) {
      return res.status(400).json({ status: 'error', message: 'Titre, matière et catégorie sont requis.' });
    }
    await validateHierarchyRefs({ matiere, chapitre });

    const uploaded = await uploadBufferToCloudinary(req.file.buffer);

    const newDocument = await Document.create({
      titre, description, auteur, matiere, chapitre, categorie,
      annee: annee ? Number(annee) : undefined,
      taille: uploaded.bytes,
      url: uploaded.secure_url,
      miniature, droitsAcces,
      publiePar: req.user.id
    });

    res.status(201).json({ status: 'success', message: 'Document ajouté avec succès', document: newDocument });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// (Admin, scope bibliotheque) Modifier un document existant
exports.updateDocument = async (req, res) => {
  try {
    const allowedFields = ['titre', 'description', 'auteur', 'matiere', 'chapitre', 'categorie', 'annee', 'taille', 'url', 'miniature', 'droitsAcces'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.matiere || updates.chapitre) {
      const existing = await Document.findById(req.params.id);
      if (!existing) return res.status(404).json({ status: 'error', message: 'Document introuvable.' });
      await validateHierarchyRefs({
        matiere: updates.matiere || existing.matiere.toString(),
        chapitre: updates.chapitre !== undefined ? updates.chapitre : existing.chapitre?.toString()
      });
    }

    const document = await Document.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!document) return res.status(404).json({ status: 'error', message: 'Document introuvable.' });

    res.status(200).json({ status: 'success', message: 'Document mis à jour.', document });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};
