import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import HierarchyPicker from '../../../components/HierarchyPicker';
import styles from './styles';

export default function QuestionForm({ onSubmit }) {
  const [matiereId, setMatiereId] = useState(null);
  const [chapitreId, setChapitreId] = useState(null);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explication, setExplication] = useState('');
  const [difficulte, setDifficulte] = useState('moyen');
  const [submitting, setSubmitting] = useState(false);

  const updateOption = (idx, value) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  };

  const handleSubmit = async () => {
    const filledOptions = options.filter((o) => o.trim() !== '');
    if (!matiereId || !questionText.trim() || filledOptions.length < 2) {
      Alert.alert('Formulaire incomplet', 'Matière, question et au moins 2 options sont requis.');
      return;
    }
    setSubmitting(true);
    await onSubmit({
      matiere: matiereId,
      chapitre: chapitreId || undefined,
      question: questionText.trim(),
      options: filledOptions,
      reponseCorrecte: Math.min(correctIndex, filledOptions.length - 1),
      explication: explication.trim() || undefined,
      difficulte,
    });
    setSubmitting(false);
  };

  return (
    <View style={styles.formCard}>
      <HierarchyPicker
        level="matieres"
        label="Matière *"
        placeholder="Sélectionner la matière..."
        value={matiereId}
        onChange={(id) => { setMatiereId(id); setChapitreId(null); }}
      />
      <HierarchyPicker
        level="chapitres"
        label="Chapitre (optionnel)"
        placeholder="Sélectionner un chapitre..."
        value={chapitreId}
        onChange={setChapitreId}
        filterParentId={matiereId}
      />

      <Text style={styles.formLabel}>Question *</Text>
      <TextInput
        style={[styles.formInput, styles.formTextarea]}
        value={questionText}
        onChangeText={setQuestionText}
        placeholder="Énoncé de la question"
        placeholderTextColor="#64748b"
        multiline
      />

      <Text style={styles.formLabel}>Options (coche la bonne réponse) *</Text>
      {options.map((opt, idx) => (
        <View key={idx} style={styles.optionRow}>
          <TouchableOpacity style={[styles.radioCircle, correctIndex === idx && styles.radioCircleActive]} onPress={() => setCorrectIndex(idx)}>
            {correctIndex === idx && <View style={styles.radioDot} />}
          </TouchableOpacity>
          <TextInput
            style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
            value={opt}
            onChangeText={(v) => updateOption(idx, v)}
            placeholder={`Option ${idx + 1}`}
            placeholderTextColor="#64748b"
          />
        </View>
      ))}

      <Text style={styles.formLabel}>Explication (optionnel)</Text>
      <TextInput
        style={[styles.formInput, styles.formTextarea]}
        value={explication}
        onChangeText={setExplication}
        placeholder="Affichée après une bonne réponse"
        placeholderTextColor="#64748b"
        multiline
      />

      <Text style={styles.formLabel}>Difficulté</Text>
      <View style={styles.optionRow}>
        {['facile', 'moyen', 'difficile'].map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.difficultyChip, difficulte === d && styles.difficultyChipActive]}
            onPress={() => setDifficulte(d)}
          >
            <Text style={[styles.difficultyChipText, difficulte === d && styles.difficultyChipTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submitFormBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#070b14" /> : <Text style={styles.submitFormBtnText}>Créer la question</Text>}
      </TouchableOpacity>
    </View>
  );
}
