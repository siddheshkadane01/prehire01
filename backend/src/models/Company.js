const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: String,
  website: String,
  industry: String,
  description: String,
  
  // Tenant (company admin) reference
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Contact information
  contactEmail: String,
  contactPhone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Subscription details
  subscription: {
    plan: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], default: 'free' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    startDate: Date,
    endDate: Date,
    jobPostLimit: { type: Number, default: 5 },
    recruiterLimit: { type: Number, default: 3 }
  },
  
  // Company settings
  settings: {
    allowPublicJobs: { type: Boolean, default: true },
    requireApprovalForJobs: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
    branding: {
      primaryColor: String,
      secondaryColor: String
    }
  },
  
  // Statistics
  stats: {
    activeJobs: { type: Number, default: 0 },
    totalApplications: { type: Number, default: 0 },
    totalRecruiters: { type: Number, default: 0 }
  },
  
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' }
}, { timestamps: true });

// Indexes
companySchema.index({ tenantId: 1 });
companySchema.index({ name: 1 });
companySchema.index({ status: 1 });
companySchema.index({ 'subscription.status': 1 });

module.exports = mongoose.model('Company', companySchema);
