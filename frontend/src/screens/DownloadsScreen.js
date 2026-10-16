import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Download,
  FileText,
  HardDrive,
  ChevronDown,
  CheckCircle2,
  MoreVertical,
  Info,
  Settings,
  Layers,
  Eye,
} from 'lucide-react-native';
import downloadService from '../services/downloadService';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';

const MAX_DOWNLOADS = 20;
const MAX_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 Go

const formatSize = (bytes) => {
  if (!bytes) return '0 Mo';
  const mo = bytes / (1024 * 1024);
  if (mo >= 1024) return `${(mo / 1024).toFixed(2)} Go`;
  return `${mo.toFixed(1)} Mo`;
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR');
};

export default function DownloadsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [selectedFilter, setSelectedFilter] = useState('Tous');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    try {
      const downloaded = await downloadService.getDownloaded();
      setFiles(downloaded);
    } catch (error) {
      Alert.alert('Erreur', "Impossible de charger les téléchargements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadFiles(); }, [loadFiles]));

  const handleOpen = (item) => {
    navigation && navigation.navigate('DocumentViewer', {
      url: item.url,
      titre: item.titre,
      localUri: item.localUri,
    });
  };

  const handleRemove = (item) => {
    Alert.alert('Supprimer ce fichier ?', item.titre, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await downloadService.remove(item.id);
          loadFiles();
        },
      },
    ]);
  };

  const totalSize = files.reduce((sum, f) => sum + (f.taille || 0), 0);
  const storageRatio = Math.min(totalSize / MAX_STORAGE_BYTES, 1);
  const limitReached = files.length >= MAX_DOWNLOADS;

  const filteredFiles = files.filter((item) => {
    if (selectedFilter === 'Tous') return true;
    if (selectedFilter === 'Cours') return (item.categorie || '').toLowerCase().includes('cours');
    if (selectedFilter === 'Exercices') return (item.categorie || '').toLowerCase().includes('exercice');
    return true;
  });

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        <AppHeader
          variant="root"
          rightActions={[
            { key: 'search', icon: 'search-outline', onPress: () => navigation && navigation.navigate('Library') },
            { key: 'profile', icon: 'person', onPress: () => navigation && navigation.navigate('Profile') },
          ]}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Titre de la section */}
          <View style={styles.titleSection}>
            <View style={styles.mainTitleRow}>
              <Download color={theme.accentAlt} size={24} />
              <Text style={styles.title}>Téléchargements</Text>
            </View>
            <Text style={styles.subtitle}>
              Accédez à vos documents hors connexion, même sans Internet.
            </Text>
          </View>

          {/* Cartes de statistiques / stock */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statLeft}>
                <View style={styles.circularProgressContainer}>
                  <View style={styles.progressRing}>
                    <Text style={styles.progressText}>{files.length}/{MAX_DOWNLOADS}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statCardTitle}>Documents téléchargés</Text>
                  <Text style={styles.statCardSubtitle}>
                    {limitReached
                      ? 'Limite atteinte — supprime un document.'
                      : `Vous pouvez encore télécharger ${MAX_DOWNLOADS - files.length} documents.`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.storageCard}>
              <View style={styles.storageHeader}>
                <HardDrive color={theme.accentAlt} size={14} style={{ marginRight: 6 }} />
                <Text style={styles.storageLabel}>Espace utilisé</Text>
                <Text style={styles.storageValue}>{formatSize(totalSize)} / 5 Go</Text>
              </View>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${storageRatio * 100}%` }]} />
              </View>
            </View>
          </View>

          {/* Filtres */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
            {['Tous', 'Cours', 'Exercices'].map((filter) => {
              const isActive = selectedFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(filter)}
                >
                  <Layers color={isActive ? '#FFFFFF' : theme.textSecondary} size={13} style={{ marginRight: 5 }} />
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{filter}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionHeading}>Mes téléchargements</Text>
            <TouchableOpacity style={styles.sortButton}>
              <Text style={styles.sortButtonText}>Plus récents</Text>
              <ChevronDown color={theme.textSecondary} size={13} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.accentAlt} style={{ marginTop: 30 }} />
          ) : filteredFiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Download color={theme.borderStrong} size={36} />
              <Text style={styles.emptyText}>Aucun document téléchargé pour l'instant.</Text>
              <Text style={styles.emptySubtext}>
                Va dans la Bibliothèque et appuie sur l'icône de téléchargement d'un document.
              </Text>
            </View>
          ) : (
            filteredFiles.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.documentCard}
                activeOpacity={0.85}
                onPress={() => handleOpen(item)}
              >
                {/* Icône du fichier */}
                <View style={styles.docIconBox}>
                  <FileText color={theme.accentAlt} size={20} />
                </View>

                {/* Infos compactes */}
                <View style={styles.docInfos}>
                  <Text style={styles.docTitle} numberOfLines={1}>{item.titre}</Text>
                  <Text style={styles.docMeta} numberOfLines={1}>
                    {item.matiere} {item.niveau ? `• ${item.niveau}` : ''}
                  </Text>
                  <View style={styles.docSubMetaRow}>
                    <View style={styles.fileTypeBadge}>
                      <Text style={styles.fileTypeText}>{item.categorie || 'Doc'}</Text>
                    </View>
                    <Text style={styles.docDetailsText}>{formatSize(item.taille)}</Text>
                    <Text style={styles.docDetailsText}>• {formatDate(item.downloadedAt)}</Text>
                  </View>
                </View>

                {/* Actions à droite optimisées */}
                <View style={styles.docCardRight}>
                  <TouchableOpacity style={styles.actionIconButton} onPress={() => handleOpen(item)}>
                    <Eye color={theme.accentAlt} size={15} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionIconButton} onPress={() => handleRemove(item)}>
                    <MoreVertical color={theme.textMuted} size={16} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}

          {limitReached && (
            <View style={styles.alertCard}>
              <View style={styles.alertLeft}>
                <View style={styles.alertIconBox}>
                  <Info color={theme.accentAlt} size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Limite atteinte</Text>
                  <Text style={styles.alertSubtitle}>
                    Vous avez atteint la limite de {MAX_DOWNLOADS} documents. Supprimez un document pour en télécharger un nouveau.
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.manageButton} onPress={loadFiles}>
                <Settings color="#FFFFFF" size={13} style={{ marginRight: 5 }} />
                <Text style={styles.manageButtonText}>Actualiser</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  titleSection: { marginBottom: 14, marginTop: 4 },
  mainTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginLeft: 8 },
  subtitle: { fontSize: 12, color: theme.textSecondary, lineHeight: 16 },

  statsContainer: {
    backgroundColor: theme.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: theme.borderStrong, marginBottom: 14,
  },
  statCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  circularProgressContainer: { marginRight: 10 },
  progressRing: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 3, borderColor: theme.accentAlt, borderLeftColor: theme.success,
    justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surfaceAlt,
  },
  progressText: { fontSize: 11, fontWeight: '800', color: theme.textPrimary },
  statCardTitle: { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 1 },
  statCardSubtitle: { fontSize: 10, color: theme.textSecondary },

  storageCard: {
    backgroundColor: theme.surfaceAlt, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: theme.borderStrong,
  },
  storageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  storageLabel: { fontSize: 11, color: theme.textSecondary, flex: 1 },
  storageValue: { fontSize: 11, fontWeight: '700', color: theme.accentAlt },
  progressBarBackground: { height: 5, backgroundColor: theme.surface, borderRadius: 2.5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.accentAlt, borderRadius: 2.5 },

  filtersContainer: { flexDirection: 'row', marginBottom: 14, maxHeight: 36 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8,
    borderWidth: 1, borderColor: theme.borderStrong, height: 32,
  },
  filterChipActive: { backgroundColor: theme.accentAlt, borderColor: theme.accentAlt },
  filterChipText: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionHeading: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
  sortButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: theme.borderStrong,
  },
  sortButtonText: { fontSize: 10, color: theme.textSecondary, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  emptySubtext: { color: theme.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },

  documentCard: {
    backgroundColor: theme.surface, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: theme.borderStrong, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  docIconBox: {
    width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    marginRight: 10, backgroundColor: theme.mode === 'dark' ? '#38BDF820' : 'rgba(8, 145, 178, 0.12)',
    borderWidth: 1, borderColor: theme.mode === 'dark' ? '#38BDF850' : 'rgba(8, 145, 178, 0.3)',
  },
  docInfos: { flex: 1, marginRight: 8 },
  docTitle: { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  docMeta: { fontSize: 10, color: theme.textSecondary, marginBottom: 4 },
  docSubMetaRow: { flexDirection: 'row', alignItems: 'center' },
  fileTypeBadge: {
    backgroundColor: theme.surfaceAlt, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4, marginRight: 6, borderWidth: 1, borderColor: theme.borderStrong,
  },
  fileTypeText: { fontSize: 8, fontWeight: '700', color: theme.accentAlt },
  docDetailsText: { fontSize: 9, color: theme.textMuted, marginRight: 6 },

  docCardRight: { flexDirection: 'row', alignItems: 'center' },
  actionIconButton: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(8, 145, 178, 0.08)',
    justifyContent: 'center', alignItems: 'center', marginLeft: 6,
    borderWidth: 1, borderColor: theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(8, 145, 178, 0.2)',
  },

  alertCard: {
    backgroundColor: theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(8, 145, 178, 0.06)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(8, 145, 178, 0.25)', marginTop: 6,
  },
  alertLeft: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  alertIconBox: {
    width: 26, height: 26, borderRadius: 6, backgroundColor: theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(8, 145, 178, 0.12)',
    justifyContent: 'center', alignItems: 'center', marginRight: 8, marginTop: 1,
  },
  alertTitle: { fontSize: 12, fontWeight: '700', color: theme.textPrimary, marginBottom: 1 },
  alertSubtitle: { fontSize: 10, color: theme.textSecondary, lineHeight: 14 },
  manageButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.accentAlt, borderRadius: 8, paddingVertical: 8,
  },
  manageButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});