import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// En-tête commun à toutes les pages de l'app — avant ce composant, chaque écran
// (Accueil, Bibliothèque, Profil, Révision, Téléchargements, Abonnement...)
// redessinait son propre en-tête avec une mise en page et des couleurs légèrement
// différentes (logo tantôt en image, tantôt en icône Ionicons ; couleur de marque
// tantôt cyan, tantôt bleu ciel). Un seul composant, deux variantes :
//
// - variant="root"  : logo Edukaya + nom/slogan de la marque, utilisé sur les pages
//                      principales accessibles depuis la barre de navigation flottante.
// - variant="back"  : bouton retour + titre de la page, utilisé sur les pages qu'on
//                      atteint en creusant (réglages, visualiseur de document, panneau admin...).
//
// Les deux partagent la même hauteur, les mêmes couleurs (issues du thème actif) et
// la même police — c'est ce qui rend l'en-tête visuellement identique partout.
export default function AppHeader({
  variant = 'root',
  title,
  subtitle,
  onBack,
  navigation,
  rightActions = [],
}) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const handleBack = () => {
    if (onBack) return onBack();
    if (navigation?.canGoBack?.()) return navigation.goBack();
    if (navigation?.goBack) return navigation.goBack();
  };

  return (
    <View style={styles.header}>
      {variant === 'back' ? (
        <>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Text style={styles.backTitle} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.backSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </>
      ) : (
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/Logoo.jpeg')}
            style={styles.logoIconImage}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.brandTitle}>Edukaya</Text>
            <Text style={styles.brandTagline}>APPRENDRE • COMPRENDRE • RÉUSSIR</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsRow}>
        {rightActions.map((action, index) => (
          <TouchableOpacity
            key={action.key || index}
            style={styles.actionButton}
            onPress={action.onPress}
            activeOpacity={0.8}
            disabled={action.disabled}
          >
            <Ionicons name={action.icon} size={18} color={action.color || theme.textPrimary} />
            {action.showDot ? <View style={styles.actionDot} /> : null}
          </TouchableOpacity>
        ))}
        {/* Garde la hauteur de l'en-tête stable même sans action à droite */}
        {variant === 'back' && rightActions.length === 0 ? <View style={styles.backButton} /> : null}
      </View>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    zIndex: 10,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoIconImage: { width: 36, height: 36, marginRight: 10, borderRadius: 8 },
  brandTitle: { fontSize: 18, fontWeight: 'bold', color: theme.accent },
  brandTagline: { fontSize: 8, color: theme.textMuted, letterSpacing: 1, fontWeight: '600' },

  backButton: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: theme.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  titleBlock: { flex: 1, marginLeft: 12, marginRight: 8 },
  backTitle: { fontSize: 15, fontWeight: 'bold', color: theme.textPrimary },
  backSubtitle: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },

  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  actionButton: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border,
    justifyContent: 'center', alignItems: 'center', marginLeft: 10,
  },
  actionDot: {
    position: 'absolute', top: 9, right: 9, width: 7, height: 7,
    borderRadius: 4, backgroundColor: theme.accent,
  },
});
