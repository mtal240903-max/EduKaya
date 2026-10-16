import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import Pdf from 'react-native-pdf';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';

// Écran d'ouverture de document — rendu NATIF, pas de WebView.
//
// Pourquoi ce changement : une version précédente affichait les documents via une
// WebView pointant vers un visualiseur en ligne (Google puis Microsoft Office Online).
// Ça exige une connexion internet à chaque ouverture, MÊME pour un document déjà
// téléchargé — ce qui va à l'encontre du but des Téléchargements hors connexion.
//
// Nouvelle approche :
// - PDF   → rendu natif par `react-native-pdf` (moteur PDFium/PDFKit natif, pas de
//           navigateur). Si le document a déjà été téléchargé (`localUri`), il s'ouvre
//           instantanément, 100% hors connexion. Sinon, la librairie télécharge et met
//           en cache le PDF elle-même avant de l'afficher (connexion nécessaire une
//           seule fois, comme pour n'importe quel contenu jamais consulté).
// - Word / PowerPoint / Excel → il n'existe pas de moteur de rendu natif léger pour ces
//           formats dans l'écosystème React Native (contrairement au PDF). On utilise
//           donc le sélecteur natif du système ("Ouvrir avec…") sur le fichier local —
//           ce n'est pas une WebView : c'est l'OS qui ouvre le fichier avec une vraie
//           application installée (Word, Google Docs, WPS...), et ça fonctionne hors
//           connexion dès que le fichier est sur l'appareil.
//
// Params de navigation attendus : { url, titre, localUri? }
const OFFICE_EXTENSIONS = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];

const getExtension = (name = '') => (name.split('.').pop() || '').toLowerCase();

export default function DocumentViewerScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { url, titre, localUri } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [openingOffice, setOpeningOffice] = useState(false);

  const ext = getExtension(titre || url || localUri || '');
  const isOffice = OFFICE_EXTENSIONS.includes(ext);
  const isPdf = ext === 'pdf' || (!isOffice && !ext); // par défaut, on tente un rendu PDF

  // Source donnée à react-native-pdf : priorité systématique à la copie locale
  // (hors connexion garanti) ; sinon l'URL distante, que la librairie mettra elle-même
  // en cache localement après le premier affichage.
  //
  // 🟢 `cacheFileName` inclut `retryKey` : quand un téléchargement échoue (ex: erreur
  // réseau, serveur qui refuse l'accès), react-native-pdf/blob-util peut laisser un
  // fichier VIDE dans son cache local sous le nom habituel. Sans ce correctif, chaque
  // "Réessayer" relisait ce même fichier vide au lieu de retélécharger, et échouait
  // systématiquement avec "File is empty" — même une fois le vrai problème corrigé côté
  // serveur. En forçant un nom de fichier différent à chaque tentative, on garantit un
  // téléchargement neuf, jamais un fichier fantôme d'un essai précédent.
  const pdfSource = useMemo(() => {
    if (localUri) return { uri: localUri };
    if (url) {
      const safeBaseName = (titre || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
      return { uri: url, cache: true, cacheFileName: `doc_${retryKey}_${safeBaseName}.pdf` };
    }
    return null;
  }, [localUri, url, retryKey, titre]);

  const handleOpenOfficeDocument = async () => {
    if (openingOffice) return;
    setOpeningOffice(true);
    try {
      let fileToOpen = localUri;

      // Pas encore téléchargé : on récupère une copie temporaire dans le cache de l'app
      // (uniquement pour pouvoir la remettre à une application native — on ne la liste
      // pas dans les Téléchargements hors connexion, qui reste une action explicite).
      if (!fileToOpen) {
        if (!url) {
          Alert.alert('Document indisponible', "Ce document n'a pas de fichier associé.");
          return;
        }
        const safeName = (titre || `document.${ext || 'bin'}`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const tmpPath = `${FileSystem.cacheDirectory}${safeName}`;
        const { uri } = await FileSystem.downloadAsync(url, tmpPath);
        fileToOpen = uri;
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Indisponible', "L'ouverture de fichiers n'est pas disponible sur cet appareil.");
        return;
      }
      await Sharing.shareAsync(fileToOpen);
    } catch (error) {
      Alert.alert(
        'Erreur',
        localUri
          ? "Impossible d'ouvrir ce document."
          : "Impossible de récupérer ce document (vérifie ta connexion internet)."
      );
    } finally {
      setOpeningOffice(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader variant="back" title={titre || 'Document'} navigation={navigation} />

      {isOffice ? (
        // Pas de rendu intégré possible pour Word/PowerPoint/Excel : ouverture native
        // directe via le sélecteur du système, sans écran intermédiaire inutile.
        <View style={styles.centerMessage}>
          <Ionicons name="document-text-outline" size={48} color={theme.textMuted} />
          <Text style={styles.emptyText}>
            {localUri
              ? 'Ce document s\'ouvre avec une application installée sur ton téléphone.'
              : 'Ce document s\'ouvre avec une application installée — téléchargement rapide nécessaire au premier affichage.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleOpenOfficeDocument} disabled={openingOffice}>
            {openingOffice ? (
              <ActivityIndicator color={theme.mode === 'dark' ? '#070b14' : '#FFFFFF'} />
            ) : (
              <Text style={styles.retryButtonText}>Ouvrir le document</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : !pdfSource ? (
        <View style={styles.centerMessage}>
          <Ionicons name="document-outline" size={48} color={theme.textMuted} />
          <Text style={styles.emptyText}>Ce document n'a pas de fichier associé.</Text>
        </View>
      ) : failed ? (
        <View style={styles.centerMessage}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={styles.emptyText}>
            {localUri
              ? "Impossible de lire la copie hors connexion de ce document."
              : "Ce document n'a pas pu être affiché."}
          </Text>
          {/* Raison réelle remontée par le lecteur PDF natif — avant, cette info était
              jetée et remplacée par un message générique "vérifie ta connexion" qui
              induisait en erreur quand la vraie cause était un fichier manquant/invalide. */}
          {errorDetail ? (
            <Text style={styles.errorDetailText} numberOfLines={3}>{errorDetail}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setFailed(false);
              setErrorDetail(null);
              setLoading(true);
              setRetryKey((k) => k + 1);
            }}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={theme.accent} size="large" />
            </View>
          )}
          <Pdf
            key={retryKey}
            source={pdfSource}
            style={styles.pdf}
            onLoadComplete={() => setLoading(false)}
            onError={(error) => {
              // On garde la vraie raison (ex: "Cannot load PDF file", "404", un message
              // réseau précis...) au lieu de l'écraser par une supposition générique.
              console.warn('[DocumentViewer] échec de chargement PDF :', error);
              setLoading(false);
              setFailed(true);
              setErrorDetail(
                typeof error === 'string' ? error : error?.message || String(error)
              );
            }}
            enablePaging
            trustAllCerts={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  pdf: { flex: 1, backgroundColor: theme.mode === 'dark' ? '#0b0f19' : theme.background },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background, zIndex: 5,
  },
  centerMessage: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyText: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 19 },
  errorDetailText: { color: theme.textMuted, fontSize: 10, textAlign: 'center', marginTop: 8, fontFamily: 'monospace' },
  retryButton: {
    backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 20,
    minWidth: 160, alignItems: 'center',
  },
  retryButtonText: { color: theme.mode === 'dark' ? '#070b14' : '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
});
