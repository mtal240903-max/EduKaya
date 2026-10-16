import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ALL_SCOPES, SCOPE_LABELS } from './constants';
import styles from './styles';

export default function AdminForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [scopes, setScopes] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleScope = (scope) => {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Email requis', "L'utilisateur doit déjà avoir un compte (inscrit via l'app).");
      return;
    }
    setSubmitting(true);
    await onSubmit({ email: email.trim(), scopes });
    setSubmitting(false);
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formLabel}>Email de la personne à promouvoir *</Text>
      <TextInput
        style={styles.formInput}
        value={email}
        onChangeText={setEmail}
        placeholder="deja-inscrit@exemple.com"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text style={styles.formHint}>
        La personne doit déjà avoir un compte étudiant (inscrite via l'app) — ce formulaire la promeut en admin.
      </Text>

      <Text style={styles.formLabel}>Périmètres attribués</Text>
      <View style={styles.optionRow}>
        {ALL_SCOPES.map((scope) => {
          const active = scopes.includes(scope);
          return (
            <TouchableOpacity
              key={scope}
              style={[styles.scopeChip, active && styles.scopeChipActive]}
              onPress={() => toggleScope(scope)}
            >
              <Text style={[styles.scopeChipText, active && styles.scopeChipTextActive]}>{SCOPE_LABELS[scope]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.submitFormBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#070b14" /> : <Text style={styles.submitFormBtnText}>Promouvoir en administrateur</Text>}
      </TouchableOpacity>
    </View>
  );
}
