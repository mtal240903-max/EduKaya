import { StyleSheet } from 'react-native';

// Styles partagés par AdminDashboardScreen et tous ses sous-composants
// (formulaires, cartes stats...). Centralisés ici pour éviter la duplication
// quand le fichier a été découpé en plusieurs modules.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070b14' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#10172a',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { color: '#00f2fe', fontSize: 17, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  tabsScroll: { maxHeight: 56 },
  tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#10172a', borderWidth: 1, borderColor: '#1e293b',
  },
  tabActive: { backgroundColor: '#00f2fe', borderColor: '#00f2fe' },
  tabText: { color: '#00f2fe', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#070b14', fontWeight: 'bold' },
  body: { padding: 16, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%', backgroundColor: '#10172a', borderRadius: 14, borderWidth: 1, borderColor: '#1e293b',
    padding: 14,
  },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 8 },
  statLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  card: {
    backgroundColor: '#10172a', borderRadius: 14, borderWidth: 1, borderColor: '#1e293b',
    padding: 14, marginBottom: 12,
  },
  cardHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  cardSubtitle: { color: '#94a3b8', fontSize: 11, marginBottom: 8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    fontSize: 10, backgroundColor: '#1e293b', color: '#cbd5e1',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  tagDanger: { backgroundColor: 'rgba(255,107,107,0.15)', color: '#ff6b6b' },
  tagSuccess: { backgroundColor: 'rgba(0,242,254,0.1)', color: '#00f2fe' },
  tagMuted: { backgroundColor: '#1e293b', color: '#64748b' },
  cardActions: {
    flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#1e293b',
    paddingTop: 10, flexWrap: 'wrap',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { color: '#00f2fe', fontSize: 12, fontWeight: '600' },

  newQuestionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#00f2fe', borderRadius: 12, paddingVertical: 12, marginBottom: 14,
  },
  newQuestionBtnText: { color: '#070b14', fontSize: 13, fontWeight: 'bold' },

  formCard: {
    backgroundColor: '#10172a', borderRadius: 14, borderWidth: 1, borderColor: '#1e293b',
    padding: 16, marginBottom: 16,
  },
  formLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  formInput: {
    backgroundColor: '#0b1120', borderRadius: 10, borderWidth: 1, borderColor: '#1e293b',
    paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 13, marginBottom: 4,
  },
  formTextarea: { minHeight: 70, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#334155',
    justifyContent: 'center', alignItems: 'center',
  },
  radioCircleActive: { borderColor: '#34D399' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#34D399' },
  difficultyChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0b1120',
    borderWidth: 1, borderColor: '#1e293b',
  },
  difficultyChipActive: { backgroundColor: '#00f2fe', borderColor: '#00f2fe' },
  difficultyChipText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  difficultyChipTextActive: { color: '#070b14', fontWeight: 'bold' },
  submitFormBtn: {
    backgroundColor: '#34D399', borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  submitFormBtnText: { color: '#070b14', fontSize: 13, fontWeight: 'bold' },

  sectionLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginTop: 8, marginBottom: 10, textTransform: 'uppercase' },
  superAdminNote: { color: '#64748b', fontSize: 11, fontStyle: 'italic' },
  scopeChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#0b1120',
    borderWidth: 1, borderColor: '#1e293b',
  },
  scopeChipActive: { backgroundColor: 'rgba(0, 242, 254, 0.15)', borderColor: '#00f2fe' },
  scopeChipText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  scopeChipTextActive: { color: '#00f2fe', fontWeight: 'bold' },
  formHint: { color: '#64748b', fontSize: 11, marginBottom: 8, lineHeight: 15 },
  logRow: {
    backgroundColor: '#0b1120', borderRadius: 10, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#1e293b',
  },
  logAction: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  logMeta: { color: '#64748b', fontSize: 10, marginTop: 2 },
  emptyLogText: { color: '#64748b', fontSize: 12, textAlign: 'center', paddingVertical: 10 },

  breadcrumbLabel: { color: '#00f2fe', fontSize: 10, marginBottom: 6 },
  filePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0b1120',
    borderRadius: 10, borderWidth: 1, borderColor: '#1e293b', borderStyle: 'dashed',
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4,
  },
  filePickerBtnText: { color: '#00f2fe', fontSize: 12, fontWeight: '600', flex: 1 },
  uploadProgressBarBg: { height: 6, backgroundColor: '#0b1120', borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  uploadProgressBarFill: { height: '100%', backgroundColor: '#00f2fe', borderRadius: 3 },
});

export default styles;
