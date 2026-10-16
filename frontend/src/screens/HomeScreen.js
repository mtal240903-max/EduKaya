import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';
import libraryService from '../services/libraryService';
import downloadService from '../services/downloadService';
import revisionService from '../services/revisionService';

// Icône + couleur du badge selon le type de fichier (affiché dans "Documents récents")
const getDocIcon = (titre = '') => {
  const ext = titre.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return { name: 'document', color: '#ef4444' };
  if (ext === 'docx' || ext === 'doc') return { name: 'document-text', color: '#3b82f6' };
  if (ext === 'pptx' || ext === 'ppt') return { name: 'easel', color: '#f59e0b' };
  return { name: 'document-attach', color: '#8b5cf6' };
};

// "Il y a 2h" / "Il y a 3j" à partir de la date de création renvoyée par le serveur
const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "À l'instant";
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
};

const formatSize = (bytes) => {
  if (!bytes) return '—';
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export default function HomeScreen({ navigation }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const firstName = user?.nom ? user.nom.split(' ')[0] : 'Étudiant(e)';

  const [recentDocs, setRecentDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [totalAccessible, setTotalAccessible] = useState(0);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [revisionStats, setRevisionStats] = useState(null);
  const [topSubject, setTopSubject] = useState(null);

  // Rechargé chaque fois que l'écran redevient actif (donc aussi quand on revient
  // de l'espace Admin après avoir ajouté un document) — pas seulement au premier montage.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          setLoadingDocs(true);
          const [docsRes, downloaded, revRes] = await Promise.all([
            libraryService.getDocuments(),
            downloadService.getDownloaded(),
            revisionService.getStats().catch(() => null),
          ]);
          if (!isActive) return;
          const docs = docsRes.documents || [];
          const sorted = [...docs].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          setRecentDocs(sorted.slice(0, 3));
          setTotalAccessible(docs.length);
          setDownloadedCount(downloaded.length);
          if (revRes) {
            setRevisionStats(revRes.stats);
            // Matière la plus avancée, pour personnaliser la carte "Reprendre"
            const subjects = [...(revRes.bySubject || [])].sort((a, b) => b.revisees - a.revisees);
            setTopSubject(subjects[0] || null);
          }
        } catch (error) {
          // Silencieux sur l'accueil : on ne bloque pas l'écran si l'API est indisponible,
          // la bibliothèque affichera déjà le message d'erreur le cas échéant.
        } finally {
          if (isActive) setLoadingDocs(false);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={[styles.container, isMenuOpen && styles.containerDimmed]}>
      {/* Effets lumineux d'arrière-plan */}
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      {/* 🟢 EN-TÊTE commun à toutes les pages (voir components/AppHeader.js) */}
      <AppHeader
        variant="root"
        rightActions={[
          {
            key: 'notifications',
            icon: 'notifications-outline',
            showDot: true,
            onPress: () => navigation && navigation.navigate('NotificationsSettings'),
          },
          {
            key: 'profile',
            icon: 'person',
            onPress: () => navigation && navigation.navigate('Profile'),
          },
        ]}
      />

      {/* Contenu Défilable */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Message de bienvenue personnalisé */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Bonjour, <Text style={styles.userName}>{firstName} ✌️</Text>
          </Text>
          <Text style={styles.subtitleText}>
            Continue ton parcours, chaque jour te rapproche de tes objectifs.
          </Text>
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un document, une matière, un sujet..."
            placeholderTextColor={theme.textMuted}
          />
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
            <Ionicons name="options-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Carte "Reprendre" — basée sur la progression réelle de révision (SM-2) */}
        <View style={styles.resumeCard}>
          <View style={styles.resumeInfo}>
            <View style={styles.resumeBadgeRow}>
              <View style={styles.playIconBadge}>
                <Ionicons name="play" size={12} color="#fff" />
              </View>
              <Text style={styles.resumeBadgeText}>Reprendre</Text>
            </View>
            <Text style={styles.resumeTitle}>{topSubject?.matiere || 'Révisions'}</Text>
            <Text style={styles.resumeSubtitle}>
              {revisionStats?.dueToday > 0
                ? `${revisionStats.dueToday} carte(s) à réviser aujourd'hui`
                : 'Continue ton parcours de révision'}
            </Text>

            {/* Barre de progression */}
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${revisionStats?.progressionGlobale ?? 0}%` }]} />
            </View>
            <Text style={styles.progressText}>{revisionStats?.progressionGlobale ?? 0}%</Text>
          </View>

          <View style={styles.resumeRightContent}>
            <Image
              source={require('../../assets/Logoo.jpeg')}
              style={styles.resumeIllustration}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => navigation && navigation.navigate('Revision')}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continuer</Text>
              <Ionicons name="arrow-forward" size={14} color={theme.mode === 'dark' ? '#070b14' : '#FFFFFF'} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Grille des 4 accès rapides connectée aux écrans */}
        <View style={styles.quickGrid}>
          <TouchableOpacity 
            style={styles.quickCard} 
            onPress={() => navigation && navigation.navigate('Library')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
              <Ionicons name="book-outline" size={22} color="#3b82f6" />
            </View>
            <Text style={styles.quickCardTitle}>Bibliothèque</Text>
            <Text style={styles.quickCardSubtitle}>Explorer les ressources</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={styles.cardArrow} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickCard} 
            onPress={() => navigation && navigation.navigate('Revision')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={22} color="#10b981" />
            </View>
            <Text style={styles.quickCardTitle}>Révisions</Text>
            <Text style={styles.quickCardSubtitle}>Tester vos connaissances</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={styles.cardArrow} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickCard} 
            onPress={() => navigation && navigation.navigate('Downloads')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="cloud-download-outline" size={22} color="#8b5cf6" />
            </View>
            <Text style={styles.quickCardTitle}>Hors connexion</Text>
            <Text style={styles.quickCardSubtitle}>Vos documents téléchargés</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={styles.cardArrow} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickCard} 
            onPress={() => navigation && navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Ionicons name="trending-up" size={22} color="#ec4899" />
            </View>
            <Text style={styles.quickCardTitle}>Profil</Text>
            <Text style={styles.quickCardSubtitle}>Suivre vos résultats</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={styles.cardArrow} />
          </TouchableOpacity>

          {!isAdmin && (
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation && navigation.navigate('Subscription')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                <Ionicons name="card-outline" size={22} color="#34D399" />
              </View>
              <Text style={styles.quickCardTitle}>Abonnement</Text>
              <Text style={styles.quickCardSubtitle}>Gérer mon accès par semestre</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={styles.cardArrow} />
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation && navigation.navigate('AdminDashboard')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#00f2fe" />
              </View>
              <Text style={styles.quickCardTitle}>Espace Admin</Text>
              <Text style={styles.quickCardSubtitle}>Gérer la plateforme</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={styles.cardArrow} />
            </TouchableOpacity>
          )}
        </View>

        {/* Section Documents récents */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={18} color={theme.accent} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Documents récents</Text>
          </View>
          <TouchableOpacity onPress={() => navigation && navigation.navigate('Library')} activeOpacity={0.8}>
            <Text style={styles.seeAllText}>Voir tout →</Text>
          </TouchableOpacity>
        </View>

        {/* Liste des documents : les 3 plus récents réellement publiés en bibliothèque */}
        <View style={styles.documentList}>
          {loadingDocs ? (
            <ActivityIndicator color={theme.accent} style={{ marginVertical: 12 }} />
          ) : recentDocs.length === 0 ? (
            <Text style={styles.emptyDocsText}>Aucun document disponible pour le moment.</Text>
          ) : (
            recentDocs.map((item) => {
              const icon = getDocIcon(item.titre);
              return (
                <TouchableOpacity
                  key={item._id}
                  style={styles.docItem}
                  activeOpacity={0.8}
                  onPress={() => navigation && navigation.navigate('Library')}
                >
                  <View style={[styles.docIconBadge, { backgroundColor: icon.color }]}>
                    <Ionicons name={icon.name} size={16} color="#fff" />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle}>{item.titre}</Text>
                    <Text style={styles.docDetails}>
                      {item.matiere?.nom || 'Matière'}
                      {item.matiere?.semestre?.niveau?.nom ? ` • ${item.matiere.semestre.niveau.nom}` : ''}
                      {item.matiere?.semestre?.nom ? ` • ${item.matiere.semestre.nom}` : ''}
                      {` • ${formatSize(item.taille)}`}
                    </Text>
                  </View>
                  <View style={styles.docRight}>
                    <Text style={styles.docTime}>{formatRelativeTime(item.createdAt)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={{ marginTop: 4 }} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Bannière Téléchargements hors connexion */}
        <View style={styles.offlineBanner}>
          <View style={styles.offlineInfo}>
            <View style={styles.offlineIconContainer}>
              <Ionicons name="cloud-download" size={20} color={theme.accent} />
            </View>
            <View>
              <Text style={styles.offlineTitle}>Téléchargements hors connexion</Text>
              <Text style={styles.offlineSubtitle}>{downloadedCount} / {totalAccessible} documents</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => navigation && navigation.navigate('Downloads')}
            activeOpacity={0.8}
          >
            <Text style={styles.manageButtonText}>Gérer</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  containerDimmed: {
    backgroundColor: theme.mode === 'dark' ? '#04060b' : theme.background,
  },
  glowTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.mode === 'dark' ? 'rgba(0, 242, 254, 0.1)' : 'rgba(0, 150, 199, 0.08)',
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: 100,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.mode === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.08)',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  welcomeContainer: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  userName: {
    color: theme.accent,
  },
  subtitleText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 13,
  },
  filterButton: {
    padding: 4,
  },
  resumeCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  resumeInfo: {
    flex: 1,
    marginRight: 10,
  },
  resumeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  resumeBadgeText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resumeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  resumeSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: theme.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    width: '72%',
    height: '100%',
    backgroundColor: theme.accent,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: theme.textSecondary,
    textAlign: 'right',
  },
  resumeRightContent: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  resumeIllustration: {
    width: 80,
    height: 60,
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: theme.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: theme.mode === 'dark' ? '#070b14' : '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  quickCard: {
    width: '48%',
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 14,
    position: 'relative',
  },
  quickIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  quickCardSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    lineHeight: 15,
  },
  cardArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.textPrimary,
  },
  seeAllText: {
    fontSize: 12,
    color: theme.accent,
    fontWeight: '600',
  },
  documentList: {
    marginBottom: 20,
  },
  emptyDocsText: {
    color: theme.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 10,
  },
  docIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  docDetails: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  docRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  docTime: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 20,
  },
  offlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.mode === 'dark' ? 'rgba(0, 242, 254, 0.1)' : 'rgba(0, 150, 199, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  offlineSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  manageButtonText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
});