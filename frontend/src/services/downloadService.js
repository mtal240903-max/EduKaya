import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REGISTRY_KEY = 'downloadedDocuments';
const DOWNLOAD_DIR = FileSystem.documentDirectory + 'edukaya-downloads/';

const ensureDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
};

const getRegistry = async () => {
  const raw = await AsyncStorage.getItem(REGISTRY_KEY);
  return raw ? JSON.parse(raw) : {};
};

const saveRegistry = async (registry) => {
  await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
};

const guessExtension = (url, fallback = 'pdf') => {
  const match = (url || '').match(/\.([a-zA-Z0-9]{2,4})(\?|$)/);
  return match ? match[1] : fallback;
};

export const downloadService = {
  // Liste tous les documents actuellement disponibles hors-ligne
  async getDownloaded() {
    const registry = await getRegistry();
    return Object.values(registry).sort((a, b) => new Date(b.downloadedAt) - new Date(a.downloadedAt));
  },

  async isDownloaded(documentId) {
    const registry = await getRegistry();
    return !!registry[documentId];
  },

  // Télécharge réellement le fichier du document et l'enregistre localement.
  // onProgress(ratio 0..1) est optionnel, pour une barre de progression.
  async download(document, onProgress) {
    await ensureDirExists();

    if (!document.url) {
      throw new Error("Ce document n'a pas de fichier associé.");
    }

    const ext = guessExtension(document.url);
    const localUri = `${DOWNLOAD_DIR}${document._id}.${ext}`;

    const downloadResumable = FileSystem.createDownloadResumable(
      document.url,
      localUri,
      {},
      (progressEvent) => {
        if (onProgress) {
          const ratio = progressEvent.totalBytesExpectedToWrite
            ? progressEvent.totalBytesWritten / progressEvent.totalBytesExpectedToWrite
            : 0;
          onProgress(ratio);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || !result.uri) {
      throw new Error('Le téléchargement a échoué.');
    }

    const fileInfo = await FileSystem.getInfoAsync(result.uri);

    const registry = await getRegistry();
    registry[document._id] = {
      id: document._id,
      titre: document.titre,
      auteur: document.auteur,
      // Gardé pour pouvoir rouvrir le document dans la visionneuse en ligne (DocumentViewer)
      // même après téléchargement — le fichier local sert de repli hors connexion.
      url: document.url,
      // Le document arrive avec sa matière peuplée (objet) : on stocke des chaînes lisibles
      // dans le registre local, pour que l'écran Téléchargements fonctionne hors connexion.
      matiere: document.matiere?.nom || document.matiere,
      niveau: document.matiere?.semestre?.niveau?.nom || document.niveau,
      semestre: document.matiere?.semestre?.nom || document.semestre,
      categorie: document.categorie,
      taille: fileInfo.size || document.taille || 0,
      localUri: result.uri,
      downloadedAt: new Date().toISOString(),
    };
    await saveRegistry(registry);

    return registry[document._id];
  },

  async remove(documentId) {
    const registry = await getRegistry();
    const entry = registry[documentId];
    if (entry?.localUri) {
      try {
        await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
      } catch (e) {
        // Le fichier a peut-être déjà été supprimé du disque ; on nettoie quand même le registre.
      }
    }
    delete registry[documentId];
    await saveRegistry(registry);
  },

  async getTotalSize() {
    const registry = await getRegistry();
    return Object.values(registry).reduce((sum, d) => sum + (d.taille || 0), 0);
  },
};

export default downloadService;
