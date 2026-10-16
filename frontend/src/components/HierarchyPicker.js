import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import hierarchyService from '../services/hierarchyService';

// Sélecteur générique pour rattacher un document/une question/un plan à
// l'arborescence académique. `level` ∈ 'semestres' | 'matieres' | 'chapitres'.
// Si `filterParentId` est fourni, ne propose que les éléments dont le parent
// immédiat correspond (ex: chapitres d'une matière donnée).
export default function HierarchyPicker({ level, value, onChange, filterParentId, label, placeholder }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Un changement de parent invalide la sélection précédente si elle n'appartient plus au bon parent
    if (filterParentId !== undefined) {
      setLoaded(false);
    }
  }, [filterParentId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await hierarchyService.getFlatList(level);
      setItems(res.items);
      setLoaded(true);
    } catch (error) {
      // silencieux : la liste vide affichera "aucun élément"
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOpen = () => {
    if (!open && !loaded) loadItems();
    setOpen((v) => !v);
  };

  const visibleItems = filterParentId ? items.filter((i) => i.parentId === filterParentId) : items;
  const selected = items.find((i) => i._id === value);

  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.trigger} onPress={handleToggleOpen}>
        <Text style={[styles.triggerText, !selected && styles.placeholderText]} numberOfLines={1}>
          {selected ? selected.breadcrumb : (placeholder || 'Sélectionner...')}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          {loading ? (
            <ActivityIndicator color="#00f2fe" style={{ padding: 12 }} />
          ) : (
            <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
              {visibleItems.length === 0 ? (
                <Text style={styles.emptyText}>
                  {filterParentId ? 'Aucun élément pour ce choix précédent.' : 'Aucun élément disponible — crée-le dans Structure académique.'}
                </Text>
              ) : (
                visibleItems.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.option}
                    onPress={() => { onChange(item._id, item.breadcrumb); setOpen(false); }}
                  >
                    <Text style={styles.optionText}>{item.breadcrumb}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0b1120', borderRadius: 10, borderWidth: 1, borderColor: '#1e293b',
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4,
  },
  triggerText: { color: '#fff', fontSize: 13, flex: 1, marginRight: 8 },
  placeholderText: { color: '#64748b' },
  dropdown: {
    backgroundColor: '#0b1120', borderRadius: 10, borderWidth: 1, borderColor: '#1e293b',
    marginBottom: 8, overflow: 'hidden',
  },
  option: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  optionText: { color: '#cbd5e1', fontSize: 12 },
  emptyText: { color: '#64748b', fontSize: 11, padding: 12, textAlign: 'center' },
});
