import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import authService from '../services/authService';

export default function ChangePasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Champs manquants', 'Remplis les trois champs.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Mot de passe trop court', 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Les mots de passe ne correspondent pas', 'Vérifie la confirmation.');
      return;
    }

    setSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      // Le serveur invalide la session courante par précaution : on déconnecte
      // localement et on laisse l'utilisateur se reconnecter avec le nouveau mot de passe.
      Alert.alert(
        'Mot de passe modifié',
        'Reconnecte-toi avec ton nouveau mot de passe.',
        [{ text: 'OK', onPress: () => logout() }]
      );
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de changer le mot de passe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader variant="back" title="Sécurité" subtitle="Changer de mot de passe" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>Mot de passe actuel</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="••••••••"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
        />

        <Text style={styles.label}>Nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Au moins 8 caractères"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
        />

        <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="••••••••"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={theme.mode === 'dark' ? '#070b14' : '#FFFFFF'} /> : <Text style={styles.saveButtonText}>Changer le mot de passe</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  body: { padding: 20, paddingBottom: 60 },
  label: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: theme.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, paddingVertical: 12, color: theme.textPrimary, fontSize: 14,
  },
  saveButton: {
    backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  saveButtonText: { color: theme.mode === 'dark' ? '#070b14' : '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
});
