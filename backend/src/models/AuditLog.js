const mongoose = require('mongoose');

// Journal des actions sensibles (gestion des admins, validation de contenu...).
// Consultable uniquement par le Super Admin — voir adminController.getAuditLog.
const auditLogSchema = new mongoose.Schema({
  acteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // ex: 'creation_admin', 'modification_scopes', 'validation_question'...
  cibleType: { type: String }, // 'User' | 'Document' | 'Question'
  cibleId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed }, // état avant/après, commentaire, etc.
}, {
  timestamps: true
});

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
