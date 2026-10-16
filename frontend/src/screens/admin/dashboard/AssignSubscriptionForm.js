import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import styles from './styles';

export default function AssignSubscriptionForm({ plans, onSubmit }) {
  const [email, setEmail] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?._id || null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !selectedPlanId) {
      Alert.alert('Formulaire incomplet', "Email et plan sont requis.");
      return;
    }
    setSubmitting(true);
    await onSubmit({ email: email.trim(), planId: selectedPlanId });
    setSubmitting(false);
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formLabel}>Email de l'utilisateur *</Text>
      <TextInput
        style={styles.formInput}
        value={email}
        onChangeText={setEmail}
        placeholder="etudiant@exemple.com"
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.formLabel}>Plan *</Text>
      <View style={styles.optionRow}>
        {plans.length === 0 ? (
          <Text style={styles.formHint}>Crée d'abord un plan actif ci-dessus.</Text>
        ) : (
          plans.map((plan) => (
            <TouchableOpacity
              key={plan._id}
              style={[styles.scopeChip, selectedPlanId === plan._id && styles.scopeChipActive]}
              onPress={() => setSelectedPlanId(plan._id)}
            >
              <Text style={[styles.scopeChipText, selectedPlanId === plan._id && styles.scopeChipTextActive]}>
                {plan.nom}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.submitFormBtn} onPress={handleSubmit} disabled={submitting || plans.length === 0}>
        {submitting ? <ActivityIndicator color="#070b14" /> : <Text style={styles.submitFormBtnText}>Attribuer l'abonnement</Text>}
      </TouchableOpacity>
    </View>
  );
}
