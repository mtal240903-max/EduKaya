import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Alert, Switch, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  User,
  Camera,
  Edit3,
  BookOpen,
  Download,
  HelpCircle,
  Star,
  ChevronRight,
  Bell,
  Shield,
  LogOut,
  Moon,
  Sun,
  Activity,
  Heart,
  GraduationCap,
  Building2,
  MapPin,
  ShieldCheck
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';
import libraryService from '../services/libraryService';
import downloadService from '../services/downloadService';
import revisionService from '../services/revisionService';
import authService from '../services/authService';

export default function ProfileScreen({ navigation }) {
  const { user, isAdmin, isSuperAdmin, logout, updateLocalUser } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = getStyles(theme);

  const [loadingStats, setLoadingStats] = useState(true);
  const [docsAvailable, setDocsAvailable] = useState(0);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [revisionStats, setRevisionStats] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Rechargé à chaque passage sur l'onglet Profil, pas seulement au premier montage —
  // sinon les chiffres restent figés après avoir ajouté des documents ou fait une révision.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          setLoadingStats(true);
          const [docsRes, downloaded, revRes] = await Promise.all([
            libraryService.getDocuments().catch(() => ({ documents: [] })),
            downloadService.getDownloaded().catch(() => []),
            revisionService.getStats().catch(() => null),
          ]);
          if (!isActive) return;
          setDocsAvailable((docsRes.documents || []).length);
          setDownloadedCount(downloaded.length);
          setRevisionStats(revRes?.stats || null);
        } finally {
          if (isActive) setLoadingStats(false);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  // 🟢 Données réelles issues de /api/auth/me (via AuthContext), avec repli
  // sur des valeurs neutres tant que le profil n'est pas encore chargé.
  const userData = {
    nom: user?.nom || '—',
    filiere: user?.filiere || 'Filière non renseignée',
    niveau: user?.niveau || 'Étudiant',
    etablissement: 'Université de Parakou',
    pays: 'Bénin',
    avatarUrl: user?.avatarUrl || null,
  };

  const handleLogout = async () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              // La navigation vers l'écran de connexion se fait automatiquement :
              // App.js bascule de stack dès que isAuthenticated devient faux.
            } catch (error) {
              console.error('Erreur lors de la déconnexion :', error);
            }
          }
        }
      ]
    );
  };

  // 🟢 Photo de profil : sélection dans la galerie puis upload vers notre
  // backend (qui la pousse lui-même sur Cloudinary — voir authController.js).
  // Nécessite expo-image-picker, ajouté avec cette fonctionnalité : un module
  // natif, donc un nouveau build du dev client est requis avant de pouvoir tester ceci.
  const handlePickAvatar = async () => {
    if (uploadingAvatar) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission refusée',
          "Autorise l'accès à tes photos dans les réglages du téléphone pour changer ta photo de profil."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      setUploadingAvatar(true);
      const updated = await authService.updateAvatar(result.assets[0]);
      updateLocalUser(updated);
    } catch (error) {
      Alert.alert('Erreur', error.message || "Impossible de mettre à jour la photo de profil.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader variant="root" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Grande carte profil supérieure */}
          <View style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarPlaceholder}>
                  {userData.avatarUrl ? (
                    <Image source={{ uri: userData.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <User color={theme.accentAlt} size={44} />
                  )}
                  {uploadingAvatar && (
                    <View style={styles.avatarUploadingOverlay}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.cameraIconButton} onPress={handlePickAvatar} disabled={uploadingAvatar}>
                  <Camera color="#FFFFFF" size={12} />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfosCol}>
                <Text style={styles.userName}>{userData.nom}</Text>

                <View style={styles.badgeRow}>
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{userData.niveau}</Text>
                  </View>
                </View>

                <View style={styles.metaInfoRow}>
                  <User color={theme.textSecondary} size={13} style={{ marginRight: 6 }} />
                  <Text style={styles.metaText}>{userData.filiere}</Text>
                </View>

                <View style={styles.metaInfoRow}>
                  <Building2 color={theme.textSecondary} size={13} style={{ marginRight: 6 }} />
                  <Text style={styles.metaText}>{userData.etablissement}</Text>
                </View>

                <View style={styles.metaInfoRow}>
                  <MapPin color={theme.textSecondary} size={13} style={{ marginRight: 6 }} />
                  <Text style={styles.metaText}>{userData.pays}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.quoteText}>« Chaque effort d'aujourd'hui est une réussite de demain. »</Text>

            <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.8}>
              <Edit3 color={theme.accentAlt} size={14} style={{ marginRight: 6 }} />
              <Text style={styles.editProfileButtonText}>Modifier le profil</Text>
            </TouchableOpacity>
          </View>

          {/* Panneau Admin / Super-Admin, visible uniquement selon le rôle réel */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.adminCard}
              onPress={() => navigation && navigation.navigate('AdminDashboard')}
              activeOpacity={0.8}
            >
              <View style={styles.adminCardLeft}>
                <View style={styles.adminIconBox}>
                  <ShieldCheck color={theme.accentAlt} size={20} />
                </View>
                <View>
                  <Text style={styles.adminCardTitle}>
                    {isSuperAdmin ? 'Panneau Super-Admin' : 'Panneau Administrateur'}
                  </Text>
                  <Text style={styles.adminCardSubtitle}>Gestion globale et publication des ressources</Text>
                </View>
              </View>
              <ChevronRight color={theme.accentAlt} size={18} />
            </TouchableOpacity>
          )}

          {/* Carte Progression globale avec 4 mini-blocs de stats — données réelles
              (bibliothèque, téléchargements hors-ligne, moteur de révision SM-2) */}
          <View style={styles.progressCard}>
            {loadingStats ? (
              <ActivityIndicator color={theme.accentAlt} style={{ marginVertical: 20 }} />
            ) : (
              <>
                <View style={styles.progressHeaderRow}>
                  <View style={styles.circularProgressContainer}>
                    <View style={styles.progressRing}>
                      <Text style={styles.progressPercentage}>{revisionStats?.progressionGlobale ?? 0}%</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.progressCardTitle}>Progression globale</Text>
                    <Text style={styles.progressCardSubtitle}>
                      {revisionStats?.dueToday > 0
                        ? `${revisionStats.dueToday} carte(s) à réviser aujourd'hui`
                        : 'Continue comme ça !'}
                    </Text>
                    <View style={styles.progressBarBackground}>
                      <View style={[styles.progressBarFill, { width: `${revisionStats?.progressionGlobale ?? 0}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.progressNumRight}>{revisionStats?.progressionGlobale ?? 0}%</Text>
                </View>

                <View style={styles.progressDivider} />

                <View style={styles.statsGrid4}>
                  <View style={styles.statBox}>
                    <BookOpen color={theme.accentAlt} size={16} style={{ marginBottom: 4 }} />
                    <Text style={styles.statBoxValue}>{docsAvailable}</Text>
                    <Text style={styles.statBoxLabel}>Documents disponibles</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Download color={theme.success} size={16} style={{ marginBottom: 4 }} />
                    <Text style={styles.statBoxValue}>{downloadedCount} / {docsAvailable}</Text>
                    <Text style={styles.statBoxLabel}>Téléchargements</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Activity color="#A78BFA" size={16} style={{ marginBottom: 4 }} />
                    <Text style={styles.statBoxValue}>{revisionStats?.cartesVues ?? 0}</Text>
                    <Text style={styles.statBoxLabel}>Cartes révisées</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Star color={theme.warning} size={16} style={{ marginBottom: 4 }} />
                    <Text style={styles.statBoxValue}>{revisionStats?.masteredCount ?? 0}</Text>
                    <Text style={styles.statBoxLabel}>Maîtrisées</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Menu Sections : Mes infos, Ma progression, etc. */}
          <View style={styles.menuCardGroup}>
            <TouchableOpacity style={styles.menuItemRow} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.8}>
              <View style={styles.menuItemLeft}>
                <User color={theme.accentAlt} size={18} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Mes informations</Text>
                  <Text style={styles.menuItemSub}>Nom, niveau, filière, établissement</Text>
                </View>
              </View>
              <ChevronRight color={theme.textMuted} size={18} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={() => navigation && navigation.navigate('Revision')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <Activity color={theme.success} size={18} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Ma progression</Text>
                  <Text style={styles.menuItemSub}>
                    {revisionStats ? `${revisionStats.progressionGlobale}% maîtrisé` : 'Voir mes statistiques et mes performances'}
                  </Text>
                </View>
              </View>
              <ChevronRight color={theme.textMuted} size={18} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={() => navigation && navigation.navigate('Downloads')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <Download color={theme.accentAlt} size={18} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Mes téléchargements</Text>
                  <Text style={styles.menuItemSub}>
                    Gérer vos documents hors ligne ({downloadedCount} / {docsAvailable})
                  </Text>
                </View>
              </View>
              <ChevronRight color={theme.textMuted} size={18} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={() => navigation && navigation.navigate('Library')}
              activeOpacity={0.8}
            >
              <View style={styles.menuItemLeft}>
                <Heart color={theme.danger} size={18} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Mes favoris</Text>
                  <Text style={styles.menuItemSub}>Vos ressources préférées</Text>
                </View>
              </View>
              <ChevronRight color={theme.textMuted} size={18} />
            </TouchableOpacity>
          </View>

          {/* Préférences & Paramètres */}
          <View style={styles.menuCardGroup}>
            <TouchableOpacity style={styles.menuItemRow} onPress={() => navigation.navigate('NotificationsSettings')} activeOpacity={0.8}>
              <View style={styles.menuItemLeft}>
                <Bell color={theme.accentAlt} size={18} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Notifications</Text>
                  <Text style={styles.menuItemSub}>Gérer vos notifications</Text>
                </View>
              </View>
              <ChevronRight color={theme.textMuted} size={18} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* Ligne Apparence avec Switch toggle — pilote le vrai thème de l'app
                (ThemeContext), partagé par tous les écrans, pas juste un réglage
                local qui ne changeait rien à l'affichage. */}
            <View style={styles.menuItemRow}>
              <View style={styles.menuItemLeft}>
                <Moon color={theme.warning} size={18} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Apparence</Text>
                  <Text style={styles.menuItemSub}>Mode clair / sombre</Text>
                </View>
              </View>
              <View style={styles.themeSwitchBox}>
                <Sun color={theme.textSecondary} size={14} style={{ marginRight: 6 }} />
                <Switch
                  trackColor={{ false: theme.border, true: theme.accentAlt }}
                  thumbColor={'#FFFFFF'}
                  ios_backgroundColor={theme.border}
                  onValueChange={toggleTheme}
                  value={isDark}
                />
              </View>
            </View>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItemRow} onPress={() => navigation.navigate('ChangePassword')} activeOpacity={0.8}>
              <View style={styles.menuItemLeft}>
                <Shield color={theme.success} size={18} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Sécurité</Text>
                  <Text style={styles.menuItemSub}>Mot de passe et confidentialité</Text>
                </View>
              </View>
              <ChevronRight color={theme.textMuted} size={18} />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItemRow} onPress={() => navigation.navigate('HelpSupport')} activeOpacity={0.8}>
              <View style={styles.menuItemLeft}>
                <HelpCircle color="#A78BFA" size={18} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Aide et support</Text>
                  <Text style={styles.menuItemSub}>FAQ, contact, signaler un problème</Text>
                </View>
              </View>
              <ChevronRight color={theme.textMuted} size={18} />
            </TouchableOpacity>
          </View>

          {/* Bouton de déconnexion */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutLeft}>
              <LogOut color={theme.danger} size={18} style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.logoutText}>Se déconnecter</Text>
                <Text style={styles.logoutSubText}>Quitter votre compte</Text>
              </View>
            </View>
            <ChevronRight color={theme.danger} size={18} />
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },

  profileCard: {
    backgroundColor: theme.surface, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: theme.border, marginBottom: 20,
  },
  profileTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatarContainer: { position: 'relative', marginRight: 14 },
  avatarPlaceholder: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: theme.surfaceAlt,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.accentAlt,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarUploadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center',
  },
  cameraIconButton: {
    position: 'absolute', bottom: 0, right: 0, width: 24, height: 24,
    borderRadius: 12, backgroundColor: theme.accentAlt, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: theme.surface,
  },
  profileInfosCol: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', marginBottom: 6 },
  badgeContainer: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: theme.accentAlt },
  metaInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  metaText: { fontSize: 11, color: theme.textSecondary },
  quoteText: {
    fontSize: 11, fontStyle: 'italic', color: theme.accentAlt, textAlign: 'center',
    marginBottom: 12, backgroundColor: theme.surfaceAlt, padding: 8, borderRadius: 8,
    borderWidth: 1, borderColor: theme.border,
  },
  editProfileButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surfaceAlt, borderRadius: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: theme.border,
  },
  editProfileButtonText: { fontSize: 12, fontWeight: '700', color: theme.accentAlt },

  adminCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.08)', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)', marginBottom: 20,
  },
  adminCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  adminIconBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  adminCardTitle: { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  adminCardSubtitle: { fontSize: 10, color: theme.textSecondary },

  progressCard: {
    backgroundColor: theme.surface, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: theme.border, marginBottom: 20,
  },
  progressHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  circularProgressContainer: {},
  progressRing: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 4, borderColor: theme.accentAlt, borderLeftColor: theme.success,
    justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surfaceAlt,
  },
  progressPercentage: { fontSize: 12, fontWeight: '800', color: theme.textPrimary },
  progressCardTitle: { fontSize: 14, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  progressCardSubtitle: { fontSize: 11, color: theme.textSecondary, marginBottom: 6 },
  progressBarBackground: {
    height: 5, backgroundColor: theme.surfaceAlt, borderRadius: 2.5, overflow: 'hidden',
  },
  progressBarFill: {
    width: '72%', height: '100%', backgroundColor: theme.accentAlt, borderRadius: 2.5,
  },
  progressNumRight: { fontSize: 13, fontWeight: '800', color: theme.accentAlt },
  progressDivider: { height: 1, backgroundColor: theme.border, marginBottom: 14 },

  statsGrid4: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: {
    flex: 1, backgroundColor: theme.surfaceAlt, borderRadius: 12, padding: 8,
    alignItems: 'center', marginHorizontal: 3, borderWidth: 1, borderColor: theme.border,
  },
  statBoxValue: { fontSize: 12, fontWeight: '800', color: theme.textPrimary, marginBottom: 2 },
  statBoxLabel: { fontSize: 9, color: theme.textSecondary, textAlign: 'center' },

  menuCardGroup: {
    backgroundColor: theme.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: theme.border, marginBottom: 20,
  },
  menuItemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  menuItemTitle: { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 1 },
  menuItemSub: { fontSize: 10, color: theme.textSecondary },
  menuDivider: { height: 1, backgroundColor: theme.border },
  themeSwitchBox: { flexDirection: 'row', alignItems: 'center' },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', marginBottom: 20,
  },
  logoutLeft: { flexDirection: 'row', alignItems: 'center' },
  logoutText: { fontSize: 13, fontWeight: '700', color: theme.danger, marginBottom: 1 },
  logoutSubText: { fontSize: 10, color: theme.textSecondary },
});
