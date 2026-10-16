import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import subscriptionService from '../services/subscriptionService';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';

const STATUT_LABELS = { actif: 'Actif', expire: 'Expiré', annule: 'Annulé' };

export default function SubscriptionScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const STATUT_COLORS = { actif: theme.success, expire: theme.textMuted, annule: theme.danger };
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);

  // 'liste' | 'attente' | 'succes' | 'echec'
  const [view, setView] = useState('liste');
  const [pendingPaiementId, setPendingPaiementId] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const pollRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansRes, subsRes] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getMySubscriptions(),
      ]);
      setPlans(plansRes.plans);
      setMySubscriptions(subsRes.subscriptions);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de charger les abonnements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { if (view === 'liste') loadData(); }, [loadData, view]));

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const activeSemestreIds = new Set(mySubscriptions.filter((s) => s.statut === 'actif').map((s) => s.semestre?._id));

  const handleSubscribe = async (plan) => {
    try {
      const res = await subscriptionService.startCheckout(plan._id);
      setPendingPaiementId(res.paiementId);
      setView('attente');

      const opened = await Linking.canOpenURL(res.checkoutUrl);
      if (opened) {
        Linking.openURL(res.checkoutUrl);
      } else {
        Alert.alert('Erreur', "Impossible d'ouvrir la page de paiement.");
      }

      // Vérifie automatiquement le statut toutes les 4s (le webhook FedaPay arrive
      // généralement en quelques secondes après le paiement), pendant 3 minutes max.
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts += 1;
        if (attempts > 45) {
          clearInterval(pollRef.current);
          return;
        }
        try {
          const statusRes = await subscriptionService.getPaymentStatus(res.paiementId);
          if (statusRes.statut === 'reussi') {
            clearInterval(pollRef.current);
            setView('succes');
          } else if (statusRes.statut === 'echoue' || statusRes.statut === 'annule') {
            clearInterval(pollRef.current);
            setView('echec');
          }
        } catch (e) {
          // silencieux, on réessaiera au prochain tick
        }
      }, 4000);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de démarrer le paiement.');
    }
  };

  const handleManualCheck = async () => {
    if (!pendingPaiementId) return;
    setCheckingStatus(true);
    try {
      const res = await subscriptionService.getPaymentStatus(pendingPaiementId);
      if (res.statut === 'reussi') {
        if (pollRef.current) clearInterval(pollRef.current);
        setView('succes');
      } else if (res.statut === 'echoue' || res.statut === 'annule') {
        if (pollRef.current) clearInterval(pollRef.current);
        setView('echec');
      } else {
        Alert.alert('En attente', "Le paiement n'est pas encore confirmé. Réessaie dans quelques secondes.");
      }
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleBackToList = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPendingPaiementId(null);
    setView('liste');
    loadData();
  };

  /* ==================== VUE ATTENTE / SUCCÈS / ÉCHEC ==================== */
  if (view !== 'liste') {
    return (
      <SafeAreaView style={[styles.container, styles.centerContainer]}>
        {view === 'attente' && (
          <>
            <ActivityIndicator color={theme.accent} size="large" />
            <Text style={styles.statusTitle}>En attente de confirmation…</Text>
            <Text style={styles.statusSubtitle}>
              Termine le paiement dans la page qui s'est ouverte, puis reviens ici.
              La confirmation arrive généralement en quelques secondes.
            </Text>
            <TouchableOpacity style={styles.checkButton} onPress={handleManualCheck} disabled={checkingStatus}>
              {checkingStatus ? <ActivityIndicator color={theme.mode === 'dark' ? '#070b14' : '#FFFFFF'} /> : <Text style={styles.checkButtonText}>Vérifier maintenant</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBackToList}>
              <Text style={styles.cancelLink}>Annuler et revenir</Text>
            </TouchableOpacity>
          </>
        )}
        {view === 'succes' && (
          <>
            <Ionicons name="checkmark-circle" size={64} color={theme.success} />
            <Text style={styles.statusTitle}>Abonnement activé ! 🎉</Text>
            <Text style={styles.statusSubtitle}>Tu as maintenant accès aux contenus de ce semestre.</Text>
            <TouchableOpacity style={styles.checkButton} onPress={handleBackToList}>
              <Text style={styles.checkButtonText}>Retour</Text>
            </TouchableOpacity>
          </>
        )}
        {view === 'echec' && (
          <>
            <Ionicons name="close-circle" size={64} color={theme.danger} />
            <Text style={styles.statusTitle}>Paiement non abouti</Text>
            <Text style={styles.statusSubtitle}>Le paiement a été refusé ou annulé. Tu peux réessayer.</Text>
            <TouchableOpacity style={styles.checkButton} onPress={handleBackToList}>
              <Text style={styles.checkButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    );
  }

  /* ==================== VUE LISTE ==================== */
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader variant="back" title="Abonnements" navigation={navigation} />

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {mySubscriptions.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Mes abonnements</Text>
              {mySubscriptions.map((sub) => (
                <View key={sub._id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{sub.plan?.nom}</Text>
                    <Text style={styles.cardSubtitle}>{sub.semestreBreadcrumb}</Text>
                    <Text style={styles.cardMeta}>
                      Jusqu'au {new Date(sub.dateFin).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <View style={[styles.statutBadge, { backgroundColor: `${STATUT_COLORS[sub.statut]}20` }]}>
                    <Text style={[styles.statutBadgeText, { color: STATUT_COLORS[sub.statut] }]}>
                      {STATUT_LABELS[sub.statut]}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Offres disponibles</Text>
          {plans.length === 0 ? (
            <Text style={styles.emptyText}>Aucune offre disponible pour le moment.</Text>
          ) : (
            plans.map((plan) => {
              const alreadyActive = activeSemestreIds.has(plan.semestre?._id);
              return (
                <View key={plan._id} style={styles.planCard}>
                  <Text style={styles.planName}>{plan.nom}</Text>
                  <Text style={styles.planSemestre}>📚 {plan.semestreBreadcrumb}</Text>
                  {plan.description ? <Text style={styles.planDescription}>{plan.description}</Text> : null}
                  {plan.fonctionnalites?.length > 0 && (
                    <View style={styles.featuresList}>
                      {plan.fonctionnalites.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                          <Ionicons name="checkmark" size={14} color={theme.success} />
                          <Text style={styles.featureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.planFooter}>
                    <Text style={styles.planPrice}>
                      {plan.prix.toLocaleString('fr-FR')} {plan.devise}
                      <Text style={styles.planDuration}> / {plan.dureeJours}j</Text>
                    </Text>
                    <TouchableOpacity
                      style={[styles.subscribeButton, alreadyActive && styles.subscribeButtonDisabled]}
                      onPress={() => handleSubscribe(plan)}
                      disabled={alreadyActive}
                    >
                      <Text style={styles.subscribeButtonText}>{alreadyActive ? 'Déjà actif' : "S'abonner"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centerContainer: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  body: { padding: 16, paddingBottom: 60 },
  sectionTitle: { color: theme.textSecondary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10, marginTop: 6 },
  emptyText: { color: theme.textMuted, fontSize: 12, textAlign: 'center', marginTop: 10 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 14,
    borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 10,
  },
  cardTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: 'bold' },
  cardSubtitle: { color: theme.accent, fontSize: 11, marginTop: 2 },
  cardMeta: { color: theme.textMuted, fontSize: 10, marginTop: 4 },
  statutBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statutBadgeText: { fontSize: 11, fontWeight: 'bold' },

  planCard: {
    backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border,
    padding: 16, marginBottom: 14,
  },
  planName: { color: theme.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  planSemestre: { color: theme.accent, fontSize: 12, marginBottom: 6 },
  planDescription: { color: theme.textSecondary, fontSize: 12, marginBottom: 10, lineHeight: 17 },
  featuresList: { marginBottom: 12, gap: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { color: theme.textSecondary, fontSize: 12 },
  planFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
  planPrice: { color: theme.textPrimary, fontSize: 18, fontWeight: 'bold' },
  planDuration: { color: theme.textMuted, fontSize: 12, fontWeight: 'normal' },
  subscribeButton: { backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  subscribeButtonDisabled: { backgroundColor: theme.surfaceAlt },
  subscribeButtonText: { color: theme.mode === 'dark' ? '#070b14' : '#FFFFFF', fontSize: 13, fontWeight: 'bold' },

  statusTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 20, textAlign: 'center' },
  statusSubtitle: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 19 },
  checkButton: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 30, marginTop: 24 },
  checkButtonText: { color: theme.mode === 'dark' ? '#070b14' : '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  cancelLink: { color: theme.textMuted, fontSize: 12, marginTop: 16, textDecorationLine: 'underline' },
});
