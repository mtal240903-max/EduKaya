import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';
import authService from '../services/authService';

export default function EditProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { user, updateLocalUser } = useAuth();

  const [nom, setNom] = useState(user?.nom || '');
  const [niveau, setNiveau] = useState(user?.niveau || '');
  const [filiere, setFiliere] = useState(user?.filiere || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nom.trim()) {
      Alert.alert('Nom requis', 'Le nom ne peut pas être vide.');
      return;
    }
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        nom: nom.trim(),
        niveau: niveau.trim(),
        filiere: filiere.trim(),
      });
      updateLocalUser(updated);
      Alert.alert('Profil mis à jour', 'Tes informations ont été enregistrées.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader variant="back" title="Mes informations" subtitle="Nom, niveau, filière" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>Nom complet</Text>
        <TextInput
          style={styles.input}
          value={nom}
          onChangeText={setNom}
          placeholder="Ton nom"
          placeholderTextColor={theme.textMuted}
        />

        <Text style={styles.label}>Niveau</Text>
        <TextInput
          style={styles.input}
          value={niveau}
          onChangeText={setNiveau}
          placeholder="Ex: Licence 2"
          placeholderTextColor={theme.textMuted}
        />

        <Text style={styles.label}>Filière</Text>
        <TextInput
          style={styles.input}
          value={filiere}
          onChangeText={setFiliere}
          placeholder="Ex: Sciences et Techniques de Production Animale"
          placeholderTextColor={theme.textMuted}
        />

        <Text style={styles.hint}>
          L'email n'est pas modifiable ici. Pour toute demande de changement d'email, utilise Aide et support.
        </Text>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={theme.mode === 'dark' ? '#070b14' : '#FFFFFF'} /> : <Text style={styles.saveButtonText}>Enregistrer</Text>}
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
  hint: { color: theme.textMuted, fontSize: 11, marginTop: 18, lineHeight: 16 },
  saveButton: {
    backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  saveButtonText: { color: theme.mode === 'dark' ? '#070b14' : '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
});
