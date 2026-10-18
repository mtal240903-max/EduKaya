import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // 👈 Import de la zone de sécurité
import { useTheme } from '../context/ThemeContext';

export default function AppHeader({
  variant = 'root',
  title,
  subtitle,
  onBack,
  navigation,
  rightActions = [],
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets(); // 👈 Récupération des marges de sécurité du téléphone
  const styles = getStyles(theme, insets); // 👈 On passe les insets aux styles

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
            source={require('../../assets/Logo_EduKaya.jpeg')}
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
        {variant === 'back' && rightActions.length === 0 ? <View style={styles.backButton} /> : null}
      </View>
    </View>
  );
}

const getStyles = (theme, insets) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    // 👈 S'adapte automatiquement au contour de l'écran (encoche/Dynamic Island + padding)
    paddingTop: Math.max(insets.top, 12), 
    paddingBottom: 12,
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