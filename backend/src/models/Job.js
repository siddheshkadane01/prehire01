const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: {
    skills: [String],
    experienceYears: {
      min: Number,
      max: Number
    },
    education: [String],
    certifications: [String]
  },
  location: {
    type: String,
    required: true
  },
  workplaceType: {
    type: String,
    enum: ['remote', 'onsite', 'hybrid'],
    required: true
  },
  salaryRange: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'paused'],
    default: 'draft'
  },
  // JD Upload fields
  jobDescriptionFile: {
    url: String,
    filename: String,
    uploadedAt: Date,
    fileSize: Number,
    extractedText: String
  },
  // Hiring team configuration
  numberOfPositions: {
    type: Number,
    default: 1,
    min: 1
  },
  numberOfRounds: {
    type: Number,
    default: 3,
    min: 1,
    max: 10
  },
  hiringManager: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String
  },
  interviewPanel: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    role: String,
    round: Number
  }],
  hrContact: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String
  },
  // Enhanced application tracking
  applications: [{
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: [
        'unscreened',
        'screening',
        'shortlisted',
        'rejected',
        'test_sent',
        'test_completed',
        'interview_scheduled',
        'interview_completed',
        'offer_extended',
        'offer_accepted',
        'offer_rejected',
        'hired',
        'withdrawn'
      ],
      default: 'unscreened'
    },
    atsScore: Number,
    screeningNotes: String,
    currentRound: {
      type: Number,
      default: 0
    },
    testAssigned: {
      testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
      assignedAt: Date,
      completedAt: Date,
      score: Number,
      status: String
    },
    interviewHistory: [{
      round: Number,
      interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      interviewerName: String,
      scheduledDate: Date,
      completedDate: Date,
      feedback: String,
      rating: Number,
      status: { type: String, enum: ['scheduled', 'completed', 'cancelled'] }
    }],
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  suggestedCandidates: [{
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    matchScore: Number,
    suggestedAt: Date,
    invited: { type: Boolean, default: false }
  }]
}, {
  timestamps: true
});

// Indexes for performance
jobSchema.index({ recruiterId: 1, status: 1 });
jobSchema.index({ companyId: 1, status: 1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ location: 1, workplaceType: 1 });
jobSchema.index({ 'requirements.skills': 1 });
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ 'applications.status': 1, 'applications.atsScore': -1 });
jobSchema.index({ 'applications.candidateId': 1 });

module.exports = mongoose.model('Job', jobSchema);
