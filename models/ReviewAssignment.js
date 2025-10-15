const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     ReviewAssignment:
 *       type: object
 *       required:
 *         - assignmentType
 *         - assignedTo
 *         - assignedBy
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated assignment ID
 *         assignmentNumber:
 *           type: string
 *           description: Unique assignment number
 *         assignmentType:
 *           type: string
 *           enum: [product_review, seller_verification, dispute_resolution, order_investigation]
 *         itemId:
 *           type: string
 *           description: ID of the item being reviewed (product, seller, etc.)
 *         assignedTo:
 *           type: string
 *           description: Admin/Officer assigned to review
 *         assignedBy:
 *           type: string
 *           description: Admin who made the assignment
 *         status:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled, reassigned]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         dueDate:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *         decision:
 *           type: string
 *           enum: [approved, rejected, needs_revision, escalated]
 *         notes:
 *           type: string
 *           description: Review notes and comments
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const reviewAssignmentSchema = new mongoose.Schema({
  assignmentNumber: {
    type: String,
    unique: true,
    required: true
  },
  assignmentType: {
    type: String,
    required: [true, 'Assignment type is required'],
    enum: {
      values: [
        'product_review', 
        'seller_verification', 
        'dispute_resolution', 
        'order_investigation',
        'refund_review',
        'account_verification',
        'content_moderation',
        'policy_violation'
      ],
      message: 'Invalid assignment type'
    }
  },
  // Reference to the item being reviewed
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Item ID is required'],
    refPath: 'itemModel'
  },
  itemModel: {
    type: String,
    required: [true, 'Item model is required'],
    enum: ['Product', 'Seller', 'Order', 'User', 'Dispute', 'Refund']
  },
  // Assignment details
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Assigned officer is required']
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Assigning admin is required']
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  // Status and priority
  status: {
    type: String,
    enum: {
      values: ['pending', 'in_progress', 'completed', 'cancelled', 'reassigned', 'escalated', 'on_hold'],
      message: 'Invalid assignment status'
    },
    default: 'pending'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Invalid priority level'
    },
    default: 'medium'
  },
  // Timing
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  estimatedHours: {
    type: Number,
    min: [0.5, 'Estimated hours must be at least 0.5'],
    max: [40, 'Estimated hours cannot exceed 40'],
    default: 2
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
    default: 0
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  // Review outcome
  decision: {
    type: String,
    enum: {
      values: ['approved', 'rejected', 'needs_revision', 'escalated', 'pending_info', 'cancelled'],
      message: 'Invalid decision'
    },
    default: null
  },
  decisionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Decision reason cannot exceed 500 characters']
  },
  // Review criteria and scoring
  reviewCriteria: [{
    criterion: {
      type: String,
      required: true,
      trim: true
    },
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: {
      type: String,
      trim: true,
      maxlength: [200, 'Criterion comments cannot exceed 200 characters']
    },
    weight: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    }
  }],
  overallScore: {
    type: Number,
    min: 0,
    max: 5,
    default: null
  },
  // Documentation and evidence
  attachments: [{
    filename: {
      type: String,
      required: true,
      trim: true
    },
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    fileType: {
      type: String,
      required: true,
      enum: ['image', 'document', 'video', 'audio', 'other']
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    }
  }],
  // Notes and communication
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  internalNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Internal notes cannot exceed 1000 characters']
  },
  publicComments: {
    type: String,
    trim: true,
    maxlength: [500, 'Public comments cannot exceed 500 characters']
  },
  // Communication log
  communications: [{
    type: {
      type: String,
      enum: ['note', 'email', 'call', 'meeting', 'system_message'],
      required: true
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound', 'internal'],
      required: true
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    to: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }],
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    },
    attachments: [{
      filename: String,
      url: String
    }]
  }],
  // Escalation details
  escalation: {
    isEscalated: {
      type: Boolean,
      default: false
    },
    escalatedAt: {
      type: Date,
      default: null
    },
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    escalationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Escalation reason cannot exceed 500 characters']
    },
    escalationLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 1
    }
  },
  // Reassignment history
  reassignmentHistory: [{
    previousAssignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    newAssignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    reassignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    reassignedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: [300, 'Reassignment reason cannot exceed 300 characters']
    }
  }],
  // Quality assurance
  qualityCheck: {
    isRequired: {
      type: Boolean,
      default: false
    },
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    checkedAt: {
      type: Date,
      default: null
    },
    qualityScore: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    qualityNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Quality notes cannot exceed 500 characters']
    },
    approved: {
      type: Boolean,
      default: null
    }
  },
  // Performance metrics
  metrics: {
    responseTime: {
      type: Number, // in hours
      default: null
    },
    completionTime: {
      type: Number, // in hours
      default: null
    },
    revisionCount: {
      type: Number,
      default: 0
    },
    customerSatisfaction: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  // Workflow and automation
  workflow: {
    currentStep: {
      type: String,
      enum: ['assignment', 'review', 'decision', 'quality_check', 'completion', 'escalation'],
      default: 'assignment'
    },
    nextStep: {
      type: String,
      enum: ['assignment', 'review', 'decision', 'quality_check', 'completion', 'escalation'],
      default: 'review'
    },
    autoAssigned: {
      type: Boolean,
      default: false
    },
    autoEscalated: {
      type: Boolean,
      default: false
    },
    remindersSent: {
      type: Number,
      default: 0
    },
    lastReminderSent: {
      type: Date,
      default: null
    }
  },
  // Tags and categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [50, 'Subcategory cannot exceed 50 characters']
  },
  // External references
  externalReferences: [{
    system: {
      type: String,
      required: true,
      trim: true
    },
    referenceId: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Reference description cannot exceed 200 characters']
    }
  }],
  // Compliance and audit
  compliance: {
    regulatoryRequirement: {
      type: String,
      trim: true
    },
    complianceChecked: {
      type: Boolean,
      default: false
    },
    complianceNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Compliance notes cannot exceed 500 characters']
    }
  },
  // Archive and retention
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  retentionDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if assignment is overdue
reviewAssignmentSchema.virtual('isOverdue').get(function() {
  return this.dueDate < new Date() && !['completed', 'cancelled'].includes(this.status);
});

// Virtual for days until due
reviewAssignmentSchema.virtual('daysUntilDue').get(function() {
  const now = new Date();
  const diffTime = this.dueDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for assignment age in days
reviewAssignmentSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const diffTime = now - this.assignedAt;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for completion percentage
reviewAssignmentSchema.virtual('completionPercentage').get(function() {
  if (this.status === 'completed') return 100;
  if (this.status === 'cancelled') return 0;
  
  const statusPercentages = {
    'pending': 0,
    'in_progress': 50,
    'escalated': 75,
    'on_hold': 25
  };
  
  return statusPercentages[this.status] || 0;
});

// Indexes for better query performance
reviewAssignmentSchema.index({ assignmentType: 1 });
reviewAssignmentSchema.index({ itemId: 1, itemModel: 1 });
reviewAssignmentSchema.index({ assignedTo: 1 });
reviewAssignmentSchema.index({ assignedBy: 1 });
reviewAssignmentSchema.index({ status: 1 });
reviewAssignmentSchema.index({ priority: 1 });
reviewAssignmentSchema.index({ dueDate: 1 });
reviewAssignmentSchema.index({ assignedAt: -1 });
reviewAssignmentSchema.index({ completedAt: -1 });
reviewAssignmentSchema.index({ 'workflow.currentStep': 1 });
reviewAssignmentSchema.index({ isArchived: 1 });

// Compound indexes
reviewAssignmentSchema.index({ assignedTo: 1, status: 1 });
reviewAssignmentSchema.index({ assignmentType: 1, status: 1 });
reviewAssignmentSchema.index({ priority: 1, dueDate: 1 });

// Pre-save middleware to generate assignment number and set defaults
reviewAssignmentSchema.pre('save', async function(next) {
  // Generate assignment number for new assignments
  if (this.isNew) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const typePrefix = this.assignmentType.toUpperCase().substr(0, 2);
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.assignmentNumber = `${year}${month}${typePrefix}${random}`;
    
    // Set default due date if not provided (3 days from now)
    if (!this.dueDate) {
      this.dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    }
    
    // Set default review criteria based on assignment type
    if (!this.reviewCriteria || this.reviewCriteria.length === 0) {
      this.reviewCriteria = this.getDefaultCriteria();
    }
  }
  
  // Update completion time when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
    
    // Calculate actual hours if started
    if (this.startedAt) {
      this.actualHours = (this.completedAt - this.startedAt) / (1000 * 60 * 60);
    }
    
    // Calculate metrics
    this.metrics.responseTime = this.startedAt ? 
      (this.startedAt - this.assignedAt) / (1000 * 60 * 60) : null;
    this.metrics.completionTime = this.actualHours;
  }
  
  // Set started time when status changes to in_progress
  if (this.isModified('status') && this.status === 'in_progress' && !this.startedAt) {
    this.startedAt = new Date();
  }
  
  next();
});

// Instance method to get default criteria based on assignment type
reviewAssignmentSchema.methods.getDefaultCriteria = function() {
  const criteriaByType = {
    product_review: [
      { criterion: 'Product Information Accuracy', weight: 0.25 },
      { criterion: 'Image Quality', weight: 0.20 },
      { criterion: 'Pricing Reasonableness', weight: 0.15 },
      { criterion: 'Category Appropriateness', weight: 0.15 },
      { criterion: 'Policy Compliance', weight: 0.25 }
    ],
    seller_verification: [
      { criterion: 'Business Documentation', weight: 0.30 },
      { criterion: 'Identity Verification', weight: 0.25 },
      { criterion: 'Bank Account Verification', weight: 0.20 },
      { criterion: 'Business Address Verification', weight: 0.15 },
      { criterion: 'References Check', weight: 0.10 }
    ],
    dispute_resolution: [
      { criterion: 'Evidence Quality', weight: 0.30 },
      { criterion: 'Policy Adherence', weight: 0.25 },
      { criterion: 'Communication Clarity', weight: 0.20 },
      { criterion: 'Resolution Fairness', weight: 0.25 }
    ],
    order_investigation: [
      { criterion: 'Order Details Accuracy', weight: 0.25 },
      { criterion: 'Payment Verification', weight: 0.25 },
      { criterion: 'Delivery Confirmation', weight: 0.25 },
      { criterion: 'Customer Communication', weight: 0.25 }
    ]
  };
  
  return criteriaByType[this.assignmentType] || [];
};

// Instance method to add communication
reviewAssignmentSchema.methods.addCommunication = function(type, direction, from, to, subject, message, attachments = []) {
  this.communications.push({
    type,
    direction,
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    message,
    attachments,
    timestamp: new Date(),
    isRead: false
  });
  return this.save();
};

// Instance method to escalate assignment
reviewAssignmentSchema.methods.escalate = function(escalatedBy, escalatedTo, reason, level = 1) {
  this.escalation = {
    isEscalated: true,
    escalatedAt: new Date(),
    escalatedBy,
    escalatedTo,
    escalationReason: reason,
    escalationLevel: level
  };
  this.status = 'escalated';
  this.workflow.currentStep = 'escalation';
  return this.save();
};

// Instance method to reassign
reviewAssignmentSchema.methods.reassign = function(newAssignee, reassignedBy, reason) {
  this.reassignmentHistory.push({
    previousAssignee: this.assignedTo,
    newAssignee,
    reassignedBy,
    reassignedAt: new Date(),
    reason
  });
  
  this.assignedTo = newAssignee;
  this.status = 'pending';
  this.workflow.currentStep = 'assignment';
  
  return this.save();
};

// Instance method to complete assignment
reviewAssignmentSchema.methods.complete = function(decision, decisionReason, overallScore, notes) {
  this.status = 'completed';
  this.decision = decision;
  this.decisionReason = decisionReason;
  this.overallScore = overallScore;
  this.notes = notes;
  this.completedAt = new Date();
  this.workflow.currentStep = 'completion';
  
  return this.save();
};

// Instance method to add attachment
reviewAssignmentSchema.methods.addAttachment = function(filename, originalName, url, fileType, fileSize, uploadedBy) {
  this.attachments.push({
    filename,
    originalName,
    url,
    fileType,
    fileSize,
    uploadedAt: new Date(),
    uploadedBy
  });
  return this.save();
};

// Static method to find assignments by officer
reviewAssignmentSchema.statics.findByOfficer = function(officerId, status = null) {
  const query = { assignedTo: officerId };
  if (status) query.status = status;
  return this.find(query).populate('assignedBy itemId');
};

// Static method to find overdue assignments
reviewAssignmentSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled'] }
  }).populate('assignedTo assignedBy');
};

// Static method to find assignments by type
reviewAssignmentSchema.statics.findByType = function(type, status = null) {
  const query = { assignmentType: type };
  if (status) query.status = status;
  return this.find(query).populate('assignedTo assignedBy');
};

// Static method to get assignment statistics
reviewAssignmentSchema.statics.getStatistics = function(startDate = null, endDate = null) {
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.assignedAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAssignments: { $sum: 1 },
        completedAssignments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        pendingAssignments: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        overdueAssignments: { $sum: { $cond: [{ $and: [{ $lt: ['$dueDate', new Date()] }, { $nin: ['$status', ['completed', 'cancelled']] }] }, 1, 0] } },
        averageCompletionTime: { $avg: '$actualHours' },
        typeBreakdown: {
          $push: {
            type: '$assignmentType',
            count: 1
          }
        }
      }
    }
  ]);
};

// Static method to find assignments needing reminders
reviewAssignmentSchema.statics.findNeedingReminders = function() {
  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  return this.find({
    dueDate: { $lte: oneDayFromNow },
    status: { $in: ['pending', 'in_progress'] },
    $or: [
      { 'workflow.lastReminderSent': { $exists: false } },
      { 'workflow.lastReminderSent': { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    ]
  }).populate('assignedTo assignedBy');
};

module.exports = mongoose.model('ReviewAssignment', reviewAssignmentSchema);