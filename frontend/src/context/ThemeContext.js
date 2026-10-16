import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const THEME_STORAGE_KEY = 'appTheme'; // 'dark' | 'light'

// Jetons de couleur partagés par tout l'écosystème de pages de l'app (Accueil,
// Bibliothèque, Révision, Téléchargements, Abonnement, Profil...). Chaque écran
// consomme ces jetons via useTheme() au lieu de coder ses couleurs en dur — c'est
// ce qui permet au bouton "Apparence" du Profil de changer réellement l'affichage,
// partout, et pas juste d'enregistrer un réglage qui ne fait rien.
const DARK_THEME = {
  mode: 'dark',
  statusBarStyle: 'light',
  // Fond de page (SafeAreaView plein) et dégradé (pages type Profil avec LinearGradient)
  background: '#070B14',
  backgroundDim: '#04060B', // variante assombrie (ex: Accueil quand un menu est ouvert)
  gradient: ['#090D1A', '#0F172A', '#1E1B4B'],
  // Cartes / surfaces
  surface: '#10172A',
  surfaceAlt: '#0B1120', // champs de saisie, zones imbriquées
  border: '#1E293B',
  borderStrong: '#334155',
  // Texte
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  // Marque / accents (inchangés entre les deux thèmes : lisibles sur fond clair et sombre)
  accent: '#00F2FE',
  accentAlt: '#38BDF8',
  success: '#34D399',
  danger: '#EF4444',
  warning: '#FBBF24',
};

const LIGHT_THEME = {
  mode: 'light',
  statusBarStyle: 'dark',
  background: '#F3F6FC',
  backgroundDim: '#E7ECF6',
  gradient: ['#EFF4FF', '#E6EDFB', '#DCE6FA'],
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  accent: '#0891B2',
  accentAlt: '#0284C7',
  success: '#059669',
  danger: '#DC2626',
  warning: '#D97706',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') setMode(saved);
      } catch (e) {
        // Pas grave : on reste sur le thème sombre par défaut.
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setThemeMode = useCallback(async (nextMode) => {
    setMode(nextMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
    } catch (e) {
      // Le changement reste actif pour la session même si la sauvegarde échoue.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setThemeMode]);

  const value = useMemo(() => ({
    theme: mode === 'dark' ? DARK_THEME : LIGHT_THEME,
    mode,
    isDark: mode === 'dark',
    isReady,
    setThemeMode,
    toggleTheme,
  }), [mode, isReady, setThemeMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={value.theme.statusBarStyle} />
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé à l\'intérieur de <ThemeProvider>');
  return ctx;
};

export default ThemeContext;
