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
      enum: ['pending', 'shortlisted', 'rejected', 'withdrawn'],
      default: 'pending'
    },
    atsScore: Number,
    notes: String
  }],
  views: {
    type: Number,
    default: 0
  },
  applicationCount: {
    type: Number,
    default: 0
  }
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

module.exports = mongoose.model('Job', jobSchema);
