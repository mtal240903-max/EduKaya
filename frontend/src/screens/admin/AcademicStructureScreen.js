import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import hierarchyService from '../../services/hierarchyService';

// Ordre fixe de l'arborescence académique — voir le document conceptuel validé.
const LEVELS = [
  { key: 'facultes', label: 'Faculté', labelPlural: 'Facultés' },
  { key: 'options', label: 'Option', labelPlural: 'Options' },
  { key: 'niveaux', label: 'Niveau', labelPlural: 'Niveaux' },
  { key: 'semestres', label: 'Semestre', labelPlural: 'Semestres' },
  { key: 'matieres', label: 'Matière', labelPlural: 'Matières' },
  { key: 'chapitres', label: 'Chapitre', labelPlural: 'Chapitres' },
];

export default function AcademicStructureScreen({ navigation }) {
  const [path, setPath] = useState([]); // [{ level, id, nom }]
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingItem, setEditingItem] = useState(null); // { id, nom }
  const [showInactive, setShowInactive] = useState(true);

  const currentLevelIndex = path.length;
  const currentLevel = LEVELS[currentLevelIndex];
  const parentId = path.length > 0 ? path[path.length - 1].id : undefined;

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await hierarchyService.getLevel(currentLevel.key, parentId);
      setItems(res.items);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [currentLevel.key, parentId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleDrillDown = (item) => {
    if (currentLevelIndex >= LEVELS.length - 1) return; // Chapitre = dernier niveau, rien en dessous
    setPath((prev) => [...prev, { level: currentLevel.key, id: item._id, nom: item.nom }]);
  };

  const handleBreadcrumbTap = (index) => {
    // index === -1 revient à la racine (Facultés)
    setPath((prev) => prev.slice(0, index + 1));
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await hierarchyService.createLevelItem(currentLevel.key, newName.trim(), parentId);
      setNewName('');
      loadItems();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Création impossible.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem?.nom.trim()) return;
    try {
      await hierarchyService.updateLevelItem(currentLevel.key, editingItem.id, editingItem.nom.trim());
      setEditingItem(null);
      loadItems();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Modification impossible.');
    }
  };

  const handleToggle = async (item) => {
    try {
      await hierarchyService.toggleLevelItem(currentLevel.key, item._id);
      loadItems();
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Supprimer ?', item.nom, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await hierarchyService.deleteLevelItem(currentLevel.key, item._id);
            loadItems();
          } catch (error) {
            // Le message serveur explique précisément pourquoi (ex: enfants existants)
            Alert.alert('Suppression impossible', error.message);
          }
        },
      },
    ]);
  };

  const visibleItems = items.filter((i) => showInactive || i.actif);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Structure académique</Text>
          <Text style={styles.headerSubtitle}>Faculté → Option → Niveau → Semestre → Matière → Chapitre</Text>
        </View>
      </View>

      {/* Fil d'Ariane */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbScroll} contentContainerStyle={styles.breadcrumbRow}>
        <TouchableOpacity onPress={() => handleBreadcrumbTap(-1)}>
          <Text style={[styles.breadcrumbText, path.length === 0 && styles.breadcrumbActive]}>
            {LEVELS[0].labelPlural}
          </Text>
        </TouchableOpacity>
        {path.map((p, idx) => (
          <View key={p.id} style={styles.breadcrumbItem}>
            <Ionicons name="chevron-forward" size={12} color="#475569" style={{ marginHorizontal: 4 }} />
            <TouchableOpacity onPress={() => handleBreadcrumbTap(idx)}>
              <Text style={[styles.breadcrumbText, idx === path.length - 1 && styles.breadcrumbActive]}>
                {p.nom}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.toolbarRow}>
        <Text style={styles.levelTitle}>{currentLevel.labelPlural} ({visibleItems.length})</Text>
        <TouchableOpacity onPress={() => setShowInactive((v) => !v)} style={styles.filterToggle}>
          <Ionicons name={showInactive ? 'eye-outline' : 'eye-off-outline'} size={14} color="#94a3b8" />
          <Text style={styles.filterToggleText}>{showInactive ? 'Tout afficher' : 'Actifs seulement'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Formulaire d'ajout */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newName}
            onChangeText={setNewName}
            placeholder={`Nouvelle ${currentLevel.label.toLowerCase()}...`}
            placeholderTextColor="#64748b"
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Ionicons name="add" size={20} color="#070b14" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#00f2fe" style={{ marginTop: 30 }} />
        ) : visibleItems.length === 0 ? (
          <Text style={styles.emptyText}>
            Aucune {currentLevel.label.toLowerCase()} {path.length > 0 ? 'dans cet élément' : 'créée'} pour l'instant.
          </Text>
        ) : (
          visibleItems.map((item) => (
            <View key={item._id} style={styles.itemCard}>
              {editingItem?.id === item._id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.addInput, { flex: 1 }]}
                    value={editingItem.nom}
                    onChangeText={(nom) => setEditingItem({ id: item._id, nom })}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveEdit} style={styles.iconBtn}>
                    <Ionicons name="checkmark" size={20} color="#34D399" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingItem(null)} style={styles.iconBtn}>
                    <Ionicons name="close" size={20} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.itemRow}
                  onPress={() => handleDrillDown(item)}
                  activeOpacity={currentLevelIndex < LEVELS.length - 1 ? 0.7 : 1}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, !item.actif && styles.itemNameInactive]}>{item.nom}</Text>
                    {!item.actif && <Text style={styles.inactiveBadge}>Désactivé</Text>}
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => setEditingItem({ id: item._id, nom: item.nom })} style={styles.iconBtn}>
                      <Ionicons name="pencil-outline" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleToggle(item)} style={styles.iconBtn}>
                      <Ionicons name={item.actif ? 'eye-off-outline' : 'eye-outline'} size={16} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                    </TouchableOpacity>
                    {currentLevelIndex < LEVELS.length - 1 && (
                      <Ionicons name="chevron-forward" size={16} color="#475569" />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070b14' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#10172a',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { color: '#00f2fe', fontSize: 16, fontWeight: 'bold' },
  headerSubtitle: { color: '#64748b', fontSize: 10, marginTop: 2 },

  breadcrumbScroll: { maxHeight: 40, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center' },
  breadcrumbText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  breadcrumbActive: { color: '#00f2fe' },

  toolbarRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12,
  },
  levelTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterToggleText: { color: '#94a3b8', fontSize: 11 },

  body: { padding: 16, paddingBottom: 60 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  addInput: {
    flex: 1, backgroundColor: '#10172a', borderRadius: 10, borderWidth: 1, borderColor: '#1e293b',
    paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 13,
  },
  addButton: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: '#00f2fe',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyText: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 30 },

  itemCard: {
    backgroundColor: '#10172a', borderRadius: 12, borderWidth: 1, borderColor: '#1e293b',
    marginBottom: 8, paddingHorizontal: 14, paddingVertical: 12,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  itemNameInactive: { color: '#64748b', textDecorationLine: 'line-through' },
  inactiveBadge: { color: '#ff6b6b', fontSize: 10, marginTop: 2 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 4 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
