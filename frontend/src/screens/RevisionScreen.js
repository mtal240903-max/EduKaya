import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BrainCircuit,
  Layers,
  Trophy,
  ChevronRight,
  FileText,
  Play,
  Sparkles,
  Sprout,
  Activity,
  BarChart3,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react-native';
import revisionService from '../services/revisionService';
import { useTheme } from '../context/ThemeContext';
import AppHeader from '../components/AppHeader';

const SUBJECT_ICONS = [Sprout, Layers, Sparkles, Activity, BarChart3, BrainCircuit];
const SUBJECT_COLORS = ['#34D399', '#38BDF8', '#A78BFA', '#FBBF24', '#F43F5E', '#2DD4BF'];

export default function RevisionScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [view, setView] = useState('apercu'); // apercu | session | resume
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // --- État de la session de quiz ---
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { correct, explication, moteur }
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });
  const [submitting, setSubmitting] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await revisionService.getStats();
      setStats(res);
    } catch (error) {
      // silencieux : l'aperçu affichera simplement l'état vide
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { if (view === 'apercu') loadStats(); }, [loadStats, view]));

  const startSession = async () => {
    try {
      setLoading(true);
      const res = await revisionService.getQueue({ limit: 10 });
      if (!res.queue || res.queue.length === 0) {
        if (res.aucunAbonnementActif) {
          Alert.alert(
            'Aucun abonnement actif',
            "L'accès à la révision se fait par semestre. Souscris à un abonnement pour débloquer les questions de ton semestre.",
            [
              { text: 'Plus tard', style: 'cancel' },
              { text: 'Voir les abonnements', onPress: () => navigation && navigation.navigate('Subscription') },
            ]
          );
        } else {
          Alert.alert('Aucune question disponible', "Il n'y a pas encore de questions disponibles. Reviens plus tard !");
        }
        setLoading(false);
        return;
      }
      setQueue(res.queue);
      setCurrentIndex(0);
      setSelectedOption(null);
      setHasAnswered(false);
      setLastResult(null);
      setSessionScore({ correct: 0, total: 0 });
      setView('session');
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de démarrer la session.');
    } finally {
      setLoading(false);
    }
  };

  const currentCard = queue[currentIndex];

  const handleSelectOption = (index) => {
    if (hasAnswered) return;
    setSelectedOption(index);
  };

  const handleValidate = async () => {
    if (selectedOption === null || !currentCard) return;
    const isCorrect = selectedOption === currentCard.question.reponseCorrecte;

    // Réponse fausse → qualité SM-2 basse et automatique (pas besoin de demander à l'utilisateur)
    if (!isCorrect) {
      await sendAnswer(1, isCorrect);
      return;
    }
    // Réponse correcte : on affiche l'explication, l'utilisateur choisira ensuite
    // la difficulté ressentie (3/4/5) pour affiner le prochain intervalle SM-2.
    setHasAnswered(true);
    setLastResult({ correct: true, pending: true });
  };

  const sendAnswer = async (quality, isCorrectOverride) => {
    if (!currentCard || submitting) return;
    setSubmitting(true);
    try {
      const res = await revisionService.submitAnswer(currentCard.question._id, quality);
      const correct = isCorrectOverride !== undefined ? isCorrectOverride : res.correct;
      setHasAnswered(true);
      setLastResult({ correct, explication: res.explication, moteur: res.moteur, pending: false });
      setSessionScore((prev) => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));
    } catch (error) {
      Alert.alert('Erreur', error.message || "Impossible d'enregistrer la réponse.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= queue.length) {
      setView('resume');
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setHasAnswered(false);
    setLastResult(null);
  };

  const handleFinishSummary = () => {
    setView('apercu');
    loadStats();
  };

  /* ==================== VUE SESSION DE QUIZ ==================== */
  if (view === 'session' && currentCard) {
    const { question } = currentCard;
    return (
      <LinearGradient colors={theme.gradient} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.sessionHeader}>
            <TouchableOpacity onPress={() => setView('apercu')} style={styles.closeButton}>
              <X color={theme.textSecondary} size={20} />
            </TouchableOpacity>
            <View style={styles.sessionProgressBarBg}>
              <View style={[styles.sessionProgressBarFill, { width: `${((currentIndex + 1) / queue.length) * 100}%` }]} />
            </View>
            <Text style={styles.sessionCounter}>{currentIndex + 1}/{queue.length}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.sessionScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.questionSubject}>{question.matiere?.nom || ''}</Text>
            <Text style={styles.questionText}>{question.question}</Text>

            <View style={styles.optionsList}>
              {question.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrectOption = hasAnswered && idx === question.reponseCorrecte;
                const isWrongSelected = hasAnswered && isSelected && idx !== question.reponseCorrecte;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.optionCard,
                      isSelected && !hasAnswered && styles.optionCardSelected,
                      isCorrectOption && styles.optionCardCorrect,
                      isWrongSelected && styles.optionCardWrong,
                    ]}
                    onPress={() => handleSelectOption(idx)}
                    disabled={hasAnswered}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.optionText}>{opt}</Text>
                    {isCorrectOption && <CheckCircle2 color={theme.success} size={18} />}
                    {isWrongSelected && <XCircle color={theme.danger} size={18} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {lastResult?.explication ? (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationLabel}>💡 Explication</Text>
                <Text style={styles.explanationText}>{lastResult.explication}</Text>
              </View>
            ) : null}

            {lastResult?.moteur ? (
              <Text style={styles.engineBadge}>
                ⚙️ Planification : {lastResult.moteur === 'python' ? 'moteur Python (SM-2)' : 'secours JS (SM-2)'}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.sessionFooter}>
            {!hasAnswered && (
              <TouchableOpacity
                style={[styles.validateButton, selectedOption === null && styles.validateButtonDisabled]}
                onPress={handleValidate}
                disabled={selectedOption === null || submitting}
              >
                {submitting ? <ActivityIndicator color={theme.mode === 'dark' ? '#070b14' : '#FFFFFF'} /> : <Text style={styles.validateButtonText}>Valider</Text>}
              </TouchableOpacity>
            )}

            {hasAnswered && lastResult?.pending && (
              <View>
                <Text style={styles.qualityPrompt}>C'était facile pour toi ?</Text>
                <View style={styles.qualityRow}>
                  <TouchableOpacity style={styles.qualityButton} onPress={() => sendAnswer(3, true)} disabled={submitting}>
                    <Text style={styles.qualityButtonText}>Difficile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.qualityButton} onPress={() => sendAnswer(4, true)} disabled={submitting}>
                    <Text style={styles.qualityButtonText}>Correct</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.qualityButton, styles.qualityButtonEasy]} onPress={() => sendAnswer(5, true)} disabled={submitting}>
                    <Text style={styles.qualityButtonText}>Facile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {hasAnswered && !lastResult?.pending && (
              <TouchableOpacity style={styles.validateButton} onPress={handleNext}>
                <Text style={styles.validateButtonText}>
                  {currentIndex + 1 >= queue.length ? 'Voir mon résultat' : 'Question suivante'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  /* ==================== VUE RÉSUMÉ DE SESSION ==================== */
  if (view === 'resume') {
    return (
      <LinearGradient colors={theme.gradient} style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.resumeContainer]}>
          <Trophy color={theme.warning} size={56} />
          <Text style={styles.resumeTitle}>Session terminée !</Text>
          <Text style={styles.resumeScore}>{sessionScore.correct} / {sessionScore.total} bonnes réponses</Text>
          <Text style={styles.resumeSubtitle}>
            Les prochaines dates de révision ont été calculées automatiquement pour chaque question.
          </Text>
          <TouchableOpacity style={styles.resumeButton} onPress={handleFinishSummary}>
            <Text style={styles.validateButtonText}>Retour à l'aperçu</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  /* ==================== VUE APERÇU ==================== */
  const bySubject = stats?.bySubject || [];
  const s = stats?.stats;

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader
          variant="root"
          rightActions={[
            { key: 'search', icon: 'search-outline', onPress: () => navigation && navigation.navigate('Library') },
            { key: 'profile', icon: 'person', onPress: () => navigation && navigation.navigate('Profile') },
          ]}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.titleSection}>
            <View style={styles.mainTitleRow}>
              <BrainCircuit color={theme.accentAlt} size={28} />
              <Text style={styles.title}>Révisions</Text>
            </View>
            <Text style={styles.subtitle}>
              Un algorithme de répétition espacée (SM-2) planifie tes révisions au bon moment.
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={theme.accentAlt} style={{ marginVertical: 30 }} />
          ) : (
            <>
              <View style={styles.progressCard}>
                <View style={styles.progressCardLeft}>
                  <View style={styles.circularProgressContainer}>
                    <View style={styles.progressRing}>
                      <Text style={styles.progressPercentage}>{s?.progressionGlobale ?? 0}%</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.progressCardTitle}>Votre progression globale</Text>
                    <Text style={styles.progressCardSubtitle}>
                      {s?.dueToday > 0 ? `${s.dueToday} carte(s) à réviser aujourd'hui` : 'Rien à réviser aujourd\'hui 🎉'}
                    </Text>
                    <View style={styles.progressBarBackground}>
                      <View style={[styles.progressBarFill, { width: `${s?.progressionGlobale ?? 0}%` }]} />
                    </View>
                  </View>
                </View>

                <View style={styles.progressStatsDivider} />

                <View style={styles.progressStatsRow}>
                  <View style={styles.statItem}>
                    <FileText color={theme.accentAlt} size={16} style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.statValue}>{s?.cartesVues ?? 0} / {s?.totalQuestions ?? 0}</Text>
                      <Text style={styles.statLabel}>Questions vues</Text>
                    </View>
                  </View>
                  <View style={styles.statItem}>
                    <Trophy color={theme.warning} size={16} style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.statValue}>{s?.masteredCount ?? 0}</Text>
                      <Text style={styles.statLabel}>Maîtrisées</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Matières</Text>
              </View>

              {bySubject.length === 0 ? (
                <View style={styles.emptySubjects}>
                  <Text style={styles.emptySubjectsText}>
                    Commence une session pour voir apparaître tes matières ici.
                  </Text>
                </View>
              ) : (
                <View style={styles.subjectsGrid}>
                  {bySubject.map((sub, idx) => {
                    const IconComponent = SUBJECT_ICONS[idx % SUBJECT_ICONS.length];
                    const color = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
                    return (
                      <View key={sub.matiereId || sub.matiere} style={styles.subjectCard}>
                        <View style={styles.subjectCardTop}>
                          <View style={[styles.subjectIconBox, { backgroundColor: color + '20', borderColor: color + '50' }]}>
                            <IconComponent color={color} size={20} />
                          </View>
                        </View>
                        <Text style={styles.subjectTitle} numberOfLines={1}>{sub.matiere}</Text>
                        <Text style={styles.subjectChapters}>{sub.maitrisees}/{sub.revisees} maîtrisées</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.quizBanner}>
                <View style={styles.quizBannerLeft}>
                  <View style={styles.quizBannerIconBox}>
                    <BrainCircuit color={theme.accentAlt} size={24} />
                  </View>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.quizBannerTitle}>Teste tes connaissances</Text>
                    <Text style={styles.quizBannerSubtitle}>
                      {s?.dueToday > 0
                        ? `${s.dueToday} question(s) t'attendent aujourd'hui.`
                        : 'Découvre de nouvelles questions.'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.startButton} onPress={startSession}>
                  <Play color="#FFFFFF" size={12} fill="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.startButtonText}>Commencer</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  titleSection: { marginBottom: 20, marginTop: 5 },
  mainTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: theme.textPrimary, marginLeft: 10 },
  subtitle: { fontSize: 13, color: theme.textSecondary, lineHeight: 18 },

  progressCard: {
    backgroundColor: theme.surface, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: theme.borderStrong, marginBottom: 24,
  },
  progressCardLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  circularProgressContainer: { marginRight: 14 },
  progressRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 4, borderColor: theme.accentAlt, borderLeftColor: theme.success,
    justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surfaceAlt,
  },
  progressPercentage: { fontSize: 13, fontWeight: '800', color: theme.textPrimary },
  progressCardTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  progressCardSubtitle: { fontSize: 11, color: theme.textSecondary, marginBottom: 8 },
  progressBarBackground: { height: 6, backgroundColor: theme.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.accentAlt, borderRadius: 3 },
  progressStatsDivider: { height: 1, backgroundColor: theme.borderStrong, marginBottom: 12 },
  progressStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statValue: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
  statLabel: { fontSize: 10, color: theme.textSecondary },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },

  emptySubjects: { paddingVertical: 16 },
  emptySubjectsText: { color: theme.textMuted, fontSize: 12, textAlign: 'center' },

  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  subjectCard: {
    width: '31%', backgroundColor: theme.surface, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: theme.borderStrong, marginBottom: 12,
  },
  subjectCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subjectIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  subjectTitle: { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  subjectChapters: { fontSize: 10, color: theme.textSecondary },

  quizBanner: {
    backgroundColor: theme.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: theme.borderStrong, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  quizBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  quizBannerIconBox: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(8, 145, 178, 0.12)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
    borderWidth: 1, borderColor: theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(8, 145, 178, 0.25)',
  },
  quizBannerTitle: { fontSize: 14, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
  quizBannerSubtitle: { fontSize: 11, color: theme.textSecondary, lineHeight: 15 },
  startButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accentAlt,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  /* ---- Session de quiz ---- */
  sessionHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, gap: 12,
  },
  closeButton: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.borderStrong,
  },
  sessionProgressBarBg: { flex: 1, height: 6, backgroundColor: theme.surface, borderRadius: 3, overflow: 'hidden' },
  sessionProgressBarFill: { height: '100%', backgroundColor: theme.accentAlt, borderRadius: 3 },
  sessionCounter: { color: theme.textSecondary, fontSize: 12, fontWeight: '700', width: 40, textAlign: 'right' },
  sessionScroll: { padding: 20, paddingBottom: 40 },
  questionSubject: { color: theme.accentAlt, fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  questionText: { color: theme.textPrimary, fontSize: 20, fontWeight: '800', lineHeight: 28, marginBottom: 24 },
  optionsList: { gap: 10 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1.5, borderColor: theme.borderStrong,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  optionCardSelected: { borderColor: theme.accentAlt, backgroundColor: theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(8, 145, 178, 0.08)' },
  optionCardCorrect: { borderColor: theme.success, backgroundColor: theme.mode === 'dark' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(5, 150, 105, 0.08)' },
  optionCardWrong: { borderColor: theme.danger, backgroundColor: theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(220, 38, 38, 0.08)' },
  optionText: { color: theme.textPrimary, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  explanationBox: {
    backgroundColor: theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.08)' : 'rgba(8, 145, 178, 0.06)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: theme.mode === 'dark' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(8, 145, 178, 0.2)', marginTop: 20,
  },
  explanationLabel: { color: theme.accentAlt, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  explanationText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  engineBadge: { color: theme.textMuted, fontSize: 10, marginTop: 10, textAlign: 'center' },

  sessionFooter: { padding: 20 },
  validateButton: {
    backgroundColor: theme.accentAlt, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  validateButtonDisabled: { opacity: 0.4 },
  validateButtonText: { color: theme.mode === 'dark' ? '#070B14' : '#FFFFFF', fontSize: 15, fontWeight: '800' },
  qualityPrompt: { color: theme.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 10 },
  qualityRow: { flexDirection: 'row', gap: 10 },
  qualityButton: {
    flex: 1, backgroundColor: theme.surface, borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', borderWidth: 1, borderColor: theme.borderStrong,
  },
  qualityButtonEasy: { borderColor: theme.success },
  qualityButtonText: { color: theme.textPrimary, fontSize: 12, fontWeight: '700' },

  /* ---- Résumé de session ---- */
  resumeContainer: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  resumeTitle: { color: theme.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 16 },
  resumeScore: { color: theme.accentAlt, fontSize: 32, fontWeight: '900', marginTop: 8 },
  resumeSubtitle: { color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 14, lineHeight: 19 },
  resumeButton: { backgroundColor: theme.accentAlt, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 30 },
});
