import React, { useState, useEffect } from 'react';
import { View, Text, Switch, SafeAreaView, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';
import notificationPrefs from '../services/notificationPrefs';

const ROWS = [
  { key: 'revisionReminders', title: 'Rappels de révision', sub: 'Te prévenir quand des cartes sont dues' },
  { key: 'newDocuments', title: 'Nouveaux documents', sub: 'Te prévenir quand un document est publié dans tes matières' },
  { key: 'subscriptionAlerts', title: 'Abonnement', sub: "T'alerter avant l'expiration de ton abonnement" },
];

export default function NotificationsSettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    notificationPrefs.get().then(setPrefs);
  }, []);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await notificationPrefs.set(next);
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader variant="back" title="Notifications" subtitle="Gérer tes rappels" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        {!prefs ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.card}>
            {ROWS.map((row, index) => (
              <View key={row.key}>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowSub}>{row.sub}</Text>
                  </View>
                  <Switch
                    trackColor={{ false: theme.border, true: theme.accent }}
                    thumbColor="#FFFFFF"
                    value={!!prefs[row.key]}
                    onValueChange={() => toggle(row.key)}
                  />
                </View>
                {index < ROWS.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}
        <Text style={styles.hint}>
          Ces réglages sont enregistrés sur cet appareil. Les notifications push ne sont pas encore
          actives sur cette version de l'app — ces interrupteurs préparent déjà tes préférences.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  body: { padding: 20, paddingBottom: 60 },
  card: {
    backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  rowSub: { color: theme.textSecondary, fontSize: 11 },
  divider: { height: 1, backgroundColor: theme.border },
  hint: { color: theme.textMuted, fontSize: 11, marginTop: 16, lineHeight: 16, textAlign: 'center' },
});
