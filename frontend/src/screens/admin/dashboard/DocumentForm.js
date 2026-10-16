import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { uploadDocumentToCloudinary } from '../../../services/cloudinaryService';
import HierarchyPicker from '../../../components/HierarchyPicker';
import styles from './styles';

// `onSubmit` ici n'est plus responsable de créer le document (c'est fait côté
// serveur, dans la même requête que l'upload) : c'est juste un callback de
// succès (fermer le formulaire, rafraîchir la liste). Voir cloudinaryService.js
// pour le détail du changement de flux (sécurité : upload déplacé côté serveur).
export default function DocumentForm({ onSubmit }) {
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [auteur, setAuteur] = useState('');
  const [matiereId, setMatiereId] = useState(null);
  const [chapitreId, setChapitreId] = useState(null);
  const [categorie, setCategorie] = useState('');
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      setFile(result.assets[0]);
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'ouvrir le sélecteur de fichiers.");
    }
  };

  const handleSubmit = async () => {
    if (!titre.trim() || !matiereId || !categorie.trim()) {
      Alert.alert('Formulaire incomplet', 'Titre, matière et catégorie sont requis.');
      return;
    }
    if (!file) {
      Alert.alert('Fichier manquant', 'Choisis le fichier du document à uploader.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      // Upload du fichier ET création du document en une seule requête, gérées
      // entièrement par notre backend (plus d'appel direct à Cloudinary depuis l'app).
      const result = await uploadDocumentToCloudinary(
        file,
        {
          titre: titre.trim(),
          description: description.trim() || undefined,
          auteur: auteur.trim() || undefined,
          matiere: matiereId,
          chapitre: chapitreId || undefined,
          categorie: categorie.trim(),
          annee: annee ? parseInt(annee, 10) : undefined,
        },
        setUploadProgress
      );
      await onSubmit(result.document);
    } catch (error) {
      Alert.alert('Échec', error.message || "L'upload ou la création a échoué.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formLabel}>Fichier *</Text>
      <TouchableOpacity style={styles.filePickerBtn} onPress={handlePickFile} disabled={uploading}>
        <Ionicons name="document-attach-outline" size={16} color="#00f2fe" />
        <Text style={styles.filePickerBtnText} numberOfLines={1}>
          {file ? file.name : 'Choisir un fichier (PDF, Word, image...)'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.formLabel}>Titre *</Text>
      <TextInput style={styles.formInput} value={titre} onChangeText={setTitre} placeholder="Ex: Cours de Nutrition - Chapitre 2" placeholderTextColor="#64748b" />

      <Text style={styles.formLabel}>Description</Text>
      <TextInput style={[styles.formInput, styles.formTextarea]} value={description} onChangeText={setDescription} placeholder="Résumé du contenu" placeholderTextColor="#64748b" multiline />

      <Text style={styles.formLabel}>Auteur</Text>
      <TextInput style={styles.formInput} value={auteur} onChangeText={setAuteur} placeholder="Ex: Pr. Dupont" placeholderTextColor="#64748b" />

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

      <Text style={styles.formLabel}>Catégorie * (Cours, TD, Exercice, Examen...)</Text>
      <TextInput style={styles.formInput} value={categorie} onChangeText={setCategorie} placeholder="Ex: Cours" placeholderTextColor="#64748b" />
      <TextInput style={styles.formInput} value={annee} onChangeText={setAnnee} placeholder="Année" placeholderTextColor="#64748b" keyboardType="numeric" />

      {uploading && (
        <View style={styles.uploadProgressBarBg}>
          <View style={[styles.uploadProgressBarFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
        </View>
      )}

      <TouchableOpacity style={styles.submitFormBtn} onPress={handleSubmit} disabled={uploading}>
        {uploading ? (
          <Text style={styles.submitFormBtnText}>Envoi en cours… {Math.round(uploadProgress * 100)}%</Text>
        ) : (
          <Text style={styles.submitFormBtnText}>Uploader et publier</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
