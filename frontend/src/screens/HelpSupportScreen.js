import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';

const FAQ = [
  {
    q: 'Comment télécharger un document pour le lire hors connexion ?',
    a: "Ouvre le document depuis la Bibliothèque, puis appuie sur l'icône de téléchargement. Il apparaîtra ensuite dans l'onglet Téléchargements, consultable sans connexion internet.",
  },
  {
    q: "Pourquoi un document ne s'affiche pas ?",
    a: "Vérifie ta connexion internet pour un document jamais ouvert auparavant. Si le problème persiste, utilise le bouton \"Réessayer\" dans le lecteur, ou contacte le support ci-dessous.",
  },
  {
    q: 'Comment changer de mot de passe ?',
    a: 'Profil → Sécurité → renseigne ton mot de passe actuel puis le nouveau.',
  },
  {
    q: "Comment fonctionne la révision (cartes) ?",
    a: "L'app utilise un algorithme de répétition espacée (SM-2) : les cartes que tu maîtrises reviennent moins souvent, celles que tu rates reviennent plus vite.",
  },
];

const SUPPORT_EMAIL = 'support@edukaya.app';

export default function HelpSupportScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const handleContact = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Support EduKaya')}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader variant="back" title="Aide et support" subtitle="FAQ et contact" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.sectionTitle}>Questions fréquentes</Text>
        {FAQ.map((item, index) => (
          <View key={index} style={styles.faqCard}>
            <Text style={styles.faqQuestion}>{item.q}</Text>
            <Text style={styles.faqAnswer}>{item.a}</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Nous contacter</Text>
        <TouchableOpacity style={styles.contactButton} onPress={handleContact} activeOpacity={0.8}>
          <Ionicons name="mail-outline" size={18} color={theme.accent} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Signaler un problème ou poser une question</Text>
            <Text style={styles.contactSub}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  body: { padding: 20, paddingBottom: 60 },
  sectionTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 12 },
  faqCard: {
    backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border,
    padding: 14, marginBottom: 10,
  },
  faqQuestion: { color: theme.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  faqAnswer: { color: theme.textSecondary, fontSize: 12, lineHeight: 18 },
  contactButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border,
    padding: 14,
  },
  contactTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  contactSub: { color: theme.textSecondary, fontSize: 11 },
});
