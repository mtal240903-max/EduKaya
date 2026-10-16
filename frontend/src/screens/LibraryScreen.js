import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import libraryService from '../services/libraryService';
import downloadService from '../services/downloadService';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';

export default function LibraryScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Tous');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [downloadedIds, setDownloadedIds] = useState(new Set());
  const [downloadingIds, setDownloadingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [noSubscription, setNoSubscription] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [docsRes, favRes, downloaded] = await Promise.all([
        libraryService.getDocuments(searchQuery ? { search: searchQuery } : {}),
        libraryService.getFavorites(),
        downloadService.getDownloaded(),
      ]);
      setDocuments(docsRes.documents);
      setNoSubscription(!!docsRes.aucunAbonnementActif);
      setFavoriteIds(new Set(favRes.documents.map((d) => d._id)));
      setDownloadedIds(new Set(downloaded.map((d) => d.id)));
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de charger la bibliothèque.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Recharge à chaque frappe de recherche (léger anti-rebond), ET à chaque fois que
  // l'écran redevient actif — par exemple quand on revient depuis le panneau Admin
  // après avoir ajouté un document. Sans ce 2e déclencheur, React Navigation réutilise
  // l'instance déjà montée de l'écran et ne rappelle jamais l'API.
  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(loadData, 300);
      return () => clearTimeout(timeout);
    }, [loadData])
  );

  const handleToggleFavorite = async (id) => {
    // Mise à jour optimiste de l'UI
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      await libraryService.toggleFavorite(id);
    } catch (error) {
      // On revient en arrière si l'appel échoue
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour les favoris.');
    }
  };

  const handleDownload = async (item) => {
    if (downloadedIds.has(item._id) || downloadingIds.has(item._id)) return;
    setDownloadingIds((prev) => new Set(prev).add(item._id));
    try {
      await downloadService.download(item);
      setDownloadedIds((prev) => new Set(prev).add(item._id));
    } catch (error) {
      Alert.alert('Téléchargement impossible', error.message || 'Réessaie plus tard.');
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(item._id);
        return next;
      });
    }
  };

  const filteredResources = documents.filter((item) => {
    // Le niveau n'est plus un champ texte du document : il se lit dans le fil d'Ariane
    // (Faculté > Option > Niveau > Semestre > Matière) renvoyé par le serveur.
    if (activeTab === 'Licence') return item.matiereBreadcrumb?.includes('Licence');
    if (activeTab === 'Master') return item.matiereBreadcrumb?.includes('Master');
    if (activeTab === 'Mes favoris') return favoriteIds.has(item._id);
    if (activeTab === 'Récents') {
      const createdAt = new Date(item.createdAt);
      const daysAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    }
    return true; // 'Tous'
  });

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    const mo = bytes / (1024 * 1024);
    return `${mo.toFixed(1)} Mo`;
  };

  const handleOpenDocument = (item) => {
    if (!item.url) {
      Alert.alert('Document indisponible', "Ce document n'a pas de fichier associé.");
      return;
    }
    navigation && navigation.navigate('DocumentViewer', { url: item.url, titre: item.titre });
  };

  const renderItem = ({ item }) => {
    const isFavorite = favoriteIds.has(item._id);
    const isDownloaded = downloadedIds.has(item._id);
    const isDownloading = downloadingIds.has(item._id);
    return (
      <TouchableOpacity
        style={styles.resourceCard}
        activeOpacity={0.85}
        onPress={() => handleOpenDocument(item)}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.resourceIconContainer}>
            <Ionicons name="document-text" size={24} color={theme.accent} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.resourceTitle}>{item.titre}</Text>
            <Text style={styles.resourceAuthor}>👤 {item.auteur || 'Auteur inconnu'}  •  📂 {item.matiere?.nom || '—'}</Text>
            <View style={styles.tagsRow}>
              {item.matiere?.semestre?.niveau?.nom ? <Text style={styles.tag}>{item.matiere.semestre.niveau.nom}</Text> : null}
              {item.matiere?.semestre?.nom ? <Text style={styles.tag}>{item.matiere.semestre.nom}</Text> : null}
              {item.chapitre?.nom ? <Text style={styles.tag}>{item.chapitre.nom}</Text> : null}
              <Text style={styles.tag}>{item.categorie}</Text>
              <Text style={styles.tag}>{formatSize(item.taille)}</Text>
              {item.annee ? <Text style={styles.tag}>📅 {item.annee}</Text> : null}
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.openButton}
            onPress={() => handleOpenDocument(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={14} color={theme.accent} style={{ marginRight: 4 }} />
            <Text style={styles.openButtonText}>Ouvrir</Text>
          </TouchableOpacity>
          <View style={styles.actionButtonsRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleDownload(item)}
              activeOpacity={0.8}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Ionicons
                  name={isDownloaded ? 'checkmark-circle' : 'cloud-download-outline'}
                  size={18}
                  color={isDownloaded ? theme.success : theme.textSecondary}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleToggleFavorite(item._id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isFavorite ? theme.accent : theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isMenuOpen && styles.containerDimmed]}>
      <AppHeader
        variant="root"
        rightActions={[
          { key: 'downloads', icon: 'cloud-download-outline', onPress: () => navigation && navigation.navigate('Downloads') },
          { key: 'notifications', icon: 'notifications-outline', showDot: true, onPress: () => navigation && navigation.navigate('NotificationsSettings') },
          { key: 'profile', icon: 'person', onPress: () => navigation && navigation.navigate('Profile') },
        ]}
      />

      <View style={styles.fixedHeader}>
        <View style={styles.pageTitleContainer}>
          <Text style={styles.mainTitle}>Bibliothèque</Text>
          <Text style={styles.subtitle}>
            Trouvez et consultez toutes vos ressources pédagogiques.{'\n'}Des milliers de documents pour vous accompagner.
          </Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={18} color={theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un document, une matière, un auteur..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
            <Ionicons name="options-outline" size={18} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.filtersScrollContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsRow}>
            {[
              { label: 'Tous', icon: 'grid-outline' },
              { label: 'Licence', icon: 'school-outline' },
              { label: 'Master', icon: 'ribbon-outline' },
              { label: 'Mes favoris', icon: 'bookmark-outline' },
              { label: 'Récents', icon: 'time-outline' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.label}
                style={[styles.filterTab, activeTab === tab.label && styles.filterTabActive]}
                onPress={() => setActiveTab(tab.label)}
                activeOpacity={0.8}
              >
                <Ionicons name={tab.icon} size={14} color={activeTab === tab.label ? (theme.mode === 'dark' ? '#070b14' : '#FFFFFF') : theme.accent} style={{ marginRight: 6 }} />
                <Text style={[styles.filterTabText, activeTab === tab.label && styles.filterTabActiveText]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>🔥 Ressources ({filteredResources.length})</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredResources}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          onRefresh={loadData}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name={noSubscription ? 'lock-closed-outline' : 'search-outline'} size={48} color={theme.textMuted} />
              <Text style={styles.emptyText}>
                {noSubscription ? 'Aucun abonnement actif' : 'Aucune ressource trouvée'}
              </Text>
              {noSubscription ? (
                <>
                  <Text style={styles.emptySubText}>
                    L'accès aux documents se fait par semestre. Souscris à un abonnement pour débloquer les ressources de ton semestre.
                  </Text>
                  <TouchableOpacity style={styles.subscribeCta} onPress={() => navigation && navigation.navigate('Subscription')}>
                    <Text style={styles.subscribeCtaText}>Voir les abonnements</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  containerDimmed: { backgroundColor: theme.mode === 'dark' ? '#04060b' : theme.background },
  fixedHeader: {
    backgroundColor: theme.background, paddingHorizontal: 16, paddingTop: 10,
    borderBottomWidth: 1, borderBottomColor: theme.border, zIndex: 10,
  },
  pageTitleContainer: { marginBottom: 12 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 2 },
  subtitle: { fontSize: 11, color: theme.textSecondary, lineHeight: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface,
    borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, height: 42, marginRight: 8,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: theme.textPrimary, fontSize: 12 },
  filterButton: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center',
  },
  filtersScrollContainer: { marginBottom: 12 },
  filterTabsRow: { flexDirection: 'row', gap: 8 },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
  },
  filterTabActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  filterTabText: { color: theme.accent, fontSize: 12, fontWeight: '600' },
  filterTabActiveText: { color: theme.mode === 'dark' ? '#070b14' : '#FFFFFF', fontWeight: 'bold' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: theme.textPrimary },
  listContainer: { padding: 16, paddingBottom: 110 },
  resourceCard: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', marginBottom: 10 },
  resourceIconContainer: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: theme.mode === 'dark' ? 'rgba(0, 242, 254, 0.1)' : 'rgba(0, 150, 199, 0.12)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardInfo: { flex: 1 },
  resourceTitle: { fontSize: 14, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 4 },
  resourceAuthor: { fontSize: 11, color: theme.textSecondary, marginBottom: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { fontSize: 10, backgroundColor: theme.surfaceAlt, color: theme.textSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8 },
  openButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingRight: 8 },
  openButtonText: { color: theme.accent, fontSize: 12, fontWeight: '600' },
  actionButtonsRight: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: theme.textMuted, fontSize: 14, marginTop: 10 },
  emptySubText: { color: theme.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center', paddingHorizontal: 30, lineHeight: 17 },
  subscribeCta: { backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11, marginTop: 16 },
  subscribeCtaText: { color: theme.mode === 'dark' ? '#070b14' : '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
});
