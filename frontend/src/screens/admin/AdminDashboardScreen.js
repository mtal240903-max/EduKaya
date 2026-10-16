import React, { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import adminService from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';

import { ALL_SCOPES, SCOPE_LABELS } from './dashboard/constants';
import styles from './dashboard/styles';
import StatCard from './dashboard/StatCard';
import AdminForm from './dashboard/AdminForm';
import DocumentForm from './dashboard/DocumentForm';
import PlanForm from './dashboard/PlanForm';
import AssignSubscriptionForm from './dashboard/AssignSubscriptionForm';
import QuestionForm from './dashboard/QuestionForm';

// Panneau unique pour Admin & Super-Admin : certaines actions (gestion des rôles,
// suppression de compte) ne s'affichent que si l'utilisateur connecté est 'super-admin'.
//
// Ce fichier a été découpé en plusieurs modules (dossier ./dashboard) pour rester
// lisible : les formulaires (AdminForm, DocumentForm, PlanForm,
// AssignSubscriptionForm, QuestionForm), StatCard, les styles et les constantes
// de périmètres (scopes) vivent chacun dans leur propre fichier. Ce composant ne
// garde que la logique d'orchestration (onglets, chargement des données, actions).
export default function AdminDashboardScreen({ navigation }) {
  const { isSuperAdmin, hasScope, user: currentUser } = useAuth();
  const [tab, setTab] = useState('apercu'); // apercu | utilisateurs | documents | questions | administrateurs
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [administrators, setAdministrators] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // 🟢 Dictionnaire de promesses nommées plutôt qu'un tableau positionnel :
      // évite tout risque de décalage d'index quand des appels sont conditionnels.
      const tasks = {
        dashboard: adminService.getDashboard(),
        users: adminService.getUsers(),
        documents: adminService.getDocumentsForModeration(),
        questions: adminService.getQuestions(),
      };
      if (isSuperAdmin) {
        tasks.administrators = adminService.getAdministrators();
        tasks.auditLog = adminService.getAuditLog({ limit: 30 });
      }
      if (hasScope('abonnements')) {
        tasks.plans = adminService.getPlans();
        tasks.subscriptions = adminService.getSubscriptions();
        tasks.subscriptionStats = adminService.getSubscriptionStats();
      }

      const keys = Object.keys(tasks);
      const values = await Promise.all(Object.values(tasks));
      const results = Object.fromEntries(keys.map((k, i) => [k, values[i]]));

      setStats(results.dashboard.stats);
      setUsers(results.users.users);
      setDocuments(results.documents.documents);
      setQuestions(results.questions.questions);
      if (results.administrators) setAdministrators(results.administrators.administrators);
      if (results.auditLog) setAuditLog(results.auditLog.logs);
      if (results.plans) setPlans(results.plans.plans);
      if (results.subscriptions) setSubscriptions(results.subscriptions.subscriptions);
      if (results.subscriptionStats) setSubscriptionStats(results.subscriptionStats.stats);
    } catch (error) {
      Alert.alert('Accès refusé', error.message || "Vous n'avez pas les droits requis.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin, hasScope]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleToggleBan = async (user) => {
    try {
      await adminService.toggleBanUser(user._id);
      loadData();
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleChangeRole = (user) => {
    const options = ['student', 'admin', 'super-admin'].filter((r) => r !== user.role);
    Alert.alert(
      `Modifier le rôle de ${user.nom}`,
      `Rôle actuel : ${user.role}`,
      [
        ...options.map((r) => ({
          text: `Passer en ${r}`,
          onPress: async () => {
            try {
              await adminService.updateUserRole(user._id, r);
              loadData();
            } catch (error) {
              Alert.alert('Erreur', error.message);
            }
          },
        })),
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleDeleteUser = (user) => {
    Alert.alert('Supprimer ce compte ?', `${user.nom} (${user.email})`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteUser(user._id);
            loadData();
          } catch (error) {
            Alert.alert('Erreur', error.message);
          }
        },
      },
    ]);
  };

  const handleToggleDocStatus = async (doc) => {
    try {
      await adminService.updateDocumentStatus(doc._id, doc.statut === 'actif' ? 'archive' : 'actif');
      loadData();
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleDeleteDoc = (doc) => {
    Alert.alert('Supprimer ce document ?', doc.titre, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteDocument(doc._id);
            loadData();
          } catch (error) {
            Alert.alert('Erreur', error.message);
          }
        },
      },
    ]);
  };

  const handleCreateQuestion = async (payload) => {
    try {
      await adminService.createQuestion(payload);
      setShowQuestionForm(false);
      loadData();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Création impossible.');
    }
  };

  // Le document est déjà créé côté serveur au moment où ce callback est appelé
  // (upload + création en une seule requête — voir DocumentForm.js) : on se
  // contente ici de fermer le formulaire et de rafraîchir la liste.
  const handleCreateDocument = async () => {
    setShowDocumentForm(false);
    loadData();
  };

  const handleCreatePlan = async (payload) => {
    try {
      await adminService.createPlan(payload);
      setShowPlanForm(false);
      loadData();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Création impossible.');
    }
  };

  const handleTogglePlanActive = async (plan) => {
    try {
      await adminService.updatePlan(plan._id, { actif: !plan.actif });
      loadData();
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleDeletePlan = (plan) => {
    Alert.alert('Supprimer ce plan ?', plan.nom, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deletePlan(plan._id);
            loadData();
          } catch (error) {
            Alert.alert('Erreur', error.message);
          }
        },
      },
    ]);
  };

  const handleAssignSubscription = async (payload) => {
    try {
      await adminService.createSubscription(payload);
      setShowAssignForm(false);
      loadData();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Attribution impossible.');
    }
  };

  const handleCancelSubscription = (subscription) => {
    Alert.alert('Annuler cet abonnement ?', `${subscription.user?.nom} — ${subscription.plan?.nom}`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.cancelSubscription(subscription._id);
            loadData();
          } catch (error) {
            Alert.alert('Erreur', error.message);
          }
        },
      },
    ]);
  };

  const handleCreateAdministrator = async (payload) => {
    try {
      await adminService.createAdministrator(payload);
      setShowAdminForm(false);
      loadData();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Création impossible.');
    }
  };

  const handleToggleScope = async (admin, scope) => {
    const current = admin.adminScopes || [];
    const next = current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope];
    try {
      await adminService.updateAdminScopes(admin._id, next);
      loadData();
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  const handleDeleteQuestion = (question) => {
    Alert.alert('Supprimer cette question ?', question.question, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteQuestion(question._id);
            loadData();
          } catch (error) {
            Alert.alert('Erreur', error.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color="#00f2fe" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {isSuperAdmin ? 'Panneau Super-Admin 👑' : 'Panneau Administrateur 🔒'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin ? 'Accès total : rôles, utilisateurs, contenus' : 'Gestion des utilisateurs et des contenus'}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsRow}>
        {[
          { key: 'apercu', label: 'Aperçu', icon: 'stats-chart-outline', visible: true },
          { key: 'utilisateurs', label: 'Utilisateurs', icon: 'people-outline', visible: hasScope('utilisateurs') },
          { key: 'documents', label: 'Modération', icon: 'document-text-outline', visible: hasScope('bibliotheque') },
          { key: 'questions', label: 'Questions', icon: 'help-circle-outline', visible: hasScope('revision') },
          { key: 'abonnements', label: 'Abonnements', icon: 'card-outline', visible: hasScope('abonnements') },
          { key: 'structure', label: 'Structure', icon: 'git-network-outline', visible: isSuperAdmin },
          { key: 'administrateurs', label: 'Administrateurs', icon: 'shield-outline', visible: isSuperAdmin },
        ].filter((t) => t.visible).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={t.icon} size={14} color={tab === t.key ? '#070b14' : '#00f2fe'} style={{ marginRight: 6 }} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f2fe" />}
      >
        {tab === 'apercu' && stats && (
          <View style={styles.statsGrid}>
            <StatCard icon="people-outline" label="Étudiants" value={stats.totalUsers} />
            <StatCard icon="shield-checkmark-outline" label="Admins" value={stats.totalAdmins} />
            <StatCard icon="document-text-outline" label="Documents actifs" value={stats.activeDocuments} />
            <StatCard icon="archive-outline" label="Archivés" value={stats.archivedDocuments} />
            <StatCard icon="ban-outline" label="Comptes suspendus" value={stats.bannedUsers} />
            <StatCard icon="folder-open-outline" label="Total documents" value={stats.totalDocuments} />
          </View>
        )}

        {tab === 'utilisateurs' && users.map((user) => (
          <View key={user._id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{user.nom}</Text>
                <Text style={styles.cardSubtitle}>{user.email}</Text>
                <View style={styles.tagsRow}>
                  <Text style={styles.tag}>{user.role}</Text>
                  {user.banni && <Text style={[styles.tag, styles.tagDanger]}>Suspendu</Text>}
                </View>
              </View>
            </View>
            <View style={styles.cardActions}>
              {user.role !== 'super-admin' && hasScope('utilisateurs') && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleBan(user)}>
                  <Ionicons name={user.banni ? 'checkmark-circle-outline' : 'ban-outline'} size={16} color="#00f2fe" />
                  <Text style={styles.actionBtnText}>{user.banni ? 'Réactiver' : 'Suspendre'}</Text>
                </TouchableOpacity>
              )}
              {isSuperAdmin && user._id !== currentUser?.id && (
                <>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleChangeRole(user)}>
                    <Ionicons name="swap-horizontal-outline" size={16} color="#00f2fe" />
                    <Text style={styles.actionBtnText}>Changer rôle</Text>
                  </TouchableOpacity>
                  {/* Un Super Admin peut supprimer un autre Super Admin (sauf le dernier,
                      vérifié côté serveur) — pas besoin de le masquer côté client. */}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteUser(user)}>
                    <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                    <Text style={[styles.actionBtnText, { color: '#ff6b6b' }]}>Supprimer</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}

        {tab === 'documents' && (
          <TouchableOpacity style={styles.newQuestionBtn} onPress={() => setShowDocumentForm((v) => !v)}>
            <Ionicons name={showDocumentForm ? 'close-outline' : 'cloud-upload-outline'} size={16} color="#070b14" />
            <Text style={styles.newQuestionBtnText}>{showDocumentForm ? 'Annuler' : 'Nouveau document'}</Text>
          </TouchableOpacity>
        )}

        {tab === 'documents' && showDocumentForm && <DocumentForm onSubmit={handleCreateDocument} />}

        {tab === 'documents' && documents.map((doc) => (
          <View key={doc._id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{doc.titre}</Text>
                <Text style={styles.cardSubtitle}>{doc.matiereBreadcrumb || 'Non rattaché'}</Text>
                <View style={styles.tagsRow}>
                  <Text style={[styles.tag, doc.statut === 'actif' ? styles.tagSuccess : styles.tagMuted]}>
                    {doc.statut}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation && navigation.navigate('DocumentViewer', { url: doc.url, titre: doc.titre })}
              >
                <Ionicons name="eye-outline" size={16} color="#00f2fe" />
                <Text style={styles.actionBtnText}>Voir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleDocStatus(doc)}>
                <Ionicons name={doc.statut === 'actif' ? 'archive-outline' : 'refresh-outline'} size={16} color="#00f2fe" />
                <Text style={styles.actionBtnText}>{doc.statut === 'actif' ? 'Archiver' : 'Republier'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteDoc(doc)}>
                <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                <Text style={[styles.actionBtnText, { color: '#ff6b6b' }]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {tab === 'questions' && (
          <>
            <TouchableOpacity style={styles.newQuestionBtn} onPress={() => setShowQuestionForm((v) => !v)}>
              <Ionicons name={showQuestionForm ? 'close-outline' : 'add-circle-outline'} size={16} color="#070b14" />
              <Text style={styles.newQuestionBtnText}>{showQuestionForm ? 'Annuler' : 'Nouvelle question'}</Text>
            </TouchableOpacity>

            {showQuestionForm && <QuestionForm onSubmit={handleCreateQuestion} />}

            {questions.map((q) => (
              <View key={q._id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{q.question}</Text>
                    <Text style={styles.cardSubtitle}>{q.matiereBreadcrumb || 'Non rattachée'} • {q.difficulte}</Text>
                    <View style={styles.tagsRow}>
                      {q.options.map((opt, idx) => (
                        <Text key={idx} style={[styles.tag, idx === q.reponseCorrecte && styles.tagSuccess]}>
                          {opt}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteQuestion(q)}>
                    <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                    <Text style={[styles.actionBtnText, { color: '#ff6b6b' }]}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'abonnements' && (
          <>
            {subscriptionStats && (
              <View style={styles.statsGrid}>
                <StatCard icon="checkmark-circle-outline" label="Abonnements actifs" value={subscriptionStats.totalActifs} />
                <StatCard icon="time-outline" label="Expirés" value={subscriptionStats.totalExpires} />
                <StatCard icon="close-circle-outline" label="Annulés" value={subscriptionStats.totalAnnules} />
                <StatCard icon="cash-outline" label="Revenu (cycle)" value={`${subscriptionStats.revenuMensuelEstime.toLocaleString('fr-FR')} XOF`} />
              </View>
            )}

            <Text style={styles.sectionLabel}>Plans</Text>
            <TouchableOpacity style={styles.newQuestionBtn} onPress={() => setShowPlanForm((v) => !v)}>
              <Ionicons name={showPlanForm ? 'close-outline' : 'add-circle-outline'} size={16} color="#070b14" />
              <Text style={styles.newQuestionBtnText}>{showPlanForm ? 'Annuler' : 'Nouveau plan'}</Text>
            </TouchableOpacity>
            {showPlanForm && <PlanForm onSubmit={handleCreatePlan} />}

            {plans.map((plan) => (
              <View key={plan._id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{plan.nom} {!plan.actif && '(désactivé)'}</Text>
                    <Text style={styles.cardSubtitle}>
                      {plan.prix.toLocaleString('fr-FR')} {plan.devise} / {plan.dureeJours} jours
                    </Text>
                    {plan.semestreBreadcrumb ? (
                      <Text style={styles.breadcrumbLabel}>📚 {plan.semestreBreadcrumb}</Text>
                    ) : null}
                    {plan.fonctionnalites?.length > 0 && (
                      <View style={styles.tagsRow}>
                        {plan.fonctionnalites.map((f, i) => <Text key={i} style={styles.tag}>{f}</Text>)}
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleTogglePlanActive(plan)}>
                    <Ionicons name={plan.actif ? 'eye-off-outline' : 'eye-outline'} size={16} color="#00f2fe" />
                    <Text style={styles.actionBtnText}>{plan.actif ? 'Désactiver' : 'Réactiver'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeletePlan(plan)}>
                    <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                    <Text style={[styles.actionBtnText, { color: '#ff6b6b' }]}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <Text style={styles.sectionLabel}>Abonnements des utilisateurs</Text>
            <TouchableOpacity style={styles.newQuestionBtn} onPress={() => setShowAssignForm((v) => !v)}>
              <Ionicons name={showAssignForm ? 'close-outline' : 'person-add-outline'} size={16} color="#070b14" />
              <Text style={styles.newQuestionBtnText}>{showAssignForm ? 'Annuler' : 'Attribuer un abonnement'}</Text>
            </TouchableOpacity>
            {showAssignForm && <AssignSubscriptionForm plans={plans.filter((p) => p.actif)} onSubmit={handleAssignSubscription} />}

            {subscriptions.map((sub) => (
              <View key={sub._id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{sub.user?.nom || '—'}</Text>
                    <Text style={styles.cardSubtitle}>{sub.user?.email} • {sub.plan?.nom}</Text>
                    <View style={styles.tagsRow}>
                      <Text style={[
                        styles.tag,
                        sub.statut === 'actif' && styles.tagSuccess,
                        sub.statut === 'annule' && styles.tagDanger,
                      ]}>
                        {sub.statut}
                      </Text>
                      <Text style={styles.tag}>jusqu'au {new Date(sub.dateFin).toLocaleDateString('fr-FR')}</Text>
                    </View>
                  </View>
                </View>
                {sub.statut === 'actif' && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleCancelSubscription(sub)}>
                      <Ionicons name="close-circle-outline" size={16} color="#ff6b6b" />
                      <Text style={[styles.actionBtnText, { color: '#ff6b6b' }]}>Annuler l'abonnement</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {tab === 'structure' && (
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Arborescence académique</Text>
            <Text style={styles.cardSubtitle}>
              Faculté → Option → Niveau → Semestre → Matière → Chapitre. C'est cette structure
              que les Admin Documents, Admin Révision et Admin Abonnements utiliseront pour
              rattacher leur contenu — ils ne peuvent pas la créer eux-mêmes.
            </Text>
            <TouchableOpacity
              style={[styles.submitFormBtn, { marginTop: 16 }]}
              onPress={() => navigation.navigate('AcademicStructure')}
            >
              <Text style={styles.submitFormBtnText}>Ouvrir le gestionnaire de structure</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'administrateurs' && (
          <>
            <TouchableOpacity style={styles.newQuestionBtn} onPress={() => setShowAdminForm((v) => !v)}>
              <Ionicons name={showAdminForm ? 'close-outline' : 'person-add-outline'} size={16} color="#070b14" />
              <Text style={styles.newQuestionBtnText}>{showAdminForm ? 'Annuler' : 'Nouvel administrateur'}</Text>
            </TouchableOpacity>

            {showAdminForm && <AdminForm onSubmit={handleCreateAdministrator} />}

            <Text style={styles.sectionLabel}>Administrateurs ({administrators.length})</Text>
            {administrators.map((admin) => (
              <View key={admin._id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {admin.nom} {admin.role === 'super-admin' && '👑'}
                    </Text>
                    <Text style={styles.cardSubtitle}>{admin.email}</Text>
                  </View>
                </View>

                {admin.role === 'super-admin' ? (
                  <Text style={styles.superAdminNote}>Accès total — périmètres non applicables.</Text>
                ) : (
                  <View style={styles.tagsRow}>
                    {ALL_SCOPES.map((scope) => {
                      const active = (admin.adminScopes || []).includes(scope);
                      return (
                        <TouchableOpacity
                          key={scope}
                          style={[styles.scopeChip, active && styles.scopeChipActive]}
                          onPress={() => handleToggleScope(admin, scope)}
                        >
                          <Text style={[styles.scopeChipText, active && styles.scopeChipTextActive]}>
                            {SCOPE_LABELS[scope]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}

            <Text style={styles.sectionLabel}>Journal d'audit (30 dernières actions)</Text>
            {auditLog.length === 0 ? (
              <Text style={styles.emptyLogText}>Aucune action enregistrée pour l'instant.</Text>
            ) : (
              auditLog.map((log) => (
                <View key={log._id} style={styles.logRow}>
                  <Text style={styles.logAction}>{log.action.replace(/_/g, ' ')}</Text>
                  <Text style={styles.logMeta}>
                    par {log.acteur?.nom || '—'} · {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
