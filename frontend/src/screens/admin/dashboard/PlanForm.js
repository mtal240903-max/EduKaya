import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import HierarchyPicker from '../../../components/HierarchyPicker';
import styles from './styles';

export default function PlanForm({ onSubmit }) {
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [prix, setPrix] = useState('');
  const [dureeJours, setDureeJours] = useState('30');
  const [fonctionnalitesText, setFonctionnalitesText] = useState('');
  const [semestreId, setSemestreId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!nom.trim() || !prix || !dureeJours || !semestreId) {
      Alert.alert('Formulaire incomplet', 'Nom, prix, durée et semestre sont requis.');
      return;
    }
    setSubmitting(true);
    await onSubmit({
      nom: nom.trim(),
      description: description.trim() || undefined,
      prix: parseFloat(prix),
      dureeJours: parseInt(dureeJours, 10),
      semestre: semestreId,
      fonctionnalites: fonctionnalitesText.split(',').map((f) => f.trim()).filter(Boolean),
    });
    setSubmitting(false);
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formLabel}>Nom du plan *</Text>
      <TextInput style={styles.formInput} value={nom} onChangeText={setNom} placeholder="Ex: Premium Mensuel" placeholderTextColor="#64748b" />

      <HierarchyPicker
        level="semestres"
        label="Semestre concerné *"
        placeholder="Sélectionner le semestre..."
        value={semestreId}
        onChange={setSemestreId}
      />
      <Text style={styles.formHint}>
        Ce plan ne donnera accès qu'aux documents et questions de ce semestre précis.
      </Text>

      <Text style={styles.formLabel}>Description</Text>
      <TextInput style={styles.formInput} value={description} onChangeText={setDescription} placeholder="Courte description" placeholderTextColor="#64748b" />

      <View style={styles.optionRow}>
        <TextInput style={[styles.formInput, { flex: 1 }]} value={prix} onChangeText={setPrix} placeholder="Prix (XOF) *" placeholderTextColor="#64748b" keyboardType="numeric" />
        <TextInput style={[styles.formInput, { flex: 1 }]} value={dureeJours} onChangeText={setDureeJours} placeholder="Durée (jours) *" placeholderTextColor="#64748b" keyboardType="numeric" />
      </View>

      <Text style={styles.formLabel}>Fonctionnalités (séparées par des virgules)</Text>
      <TextInput
        style={styles.formInput}
        value={fonctionnalitesText}
        onChangeText={setFonctionnalitesText}
        placeholder="Ex: Téléchargements illimités, Sans publicité"
        placeholderTextColor="#64748b"
      />

      <TouchableOpacity style={styles.submitFormBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#070b14" /> : <Text style={styles.submitFormBtnText}>Créer le plan</Text>}
      </TouchableOpacity>
    </View>
  );
}
