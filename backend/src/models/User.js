const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['candidate', 'recruiter', 'tenant', 'admin'], required: true },
  // Multi-tenant fields
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For recruiters - links to their tenant
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who created this user
  // Social login fields
  googleId: String,
  facebookId: String,
  linkedinId: String,
  provider: { type: String, enum: ['local', 'google', 'facebook', 'linkedin'], default: 'local' },
  photo: String,
  linkedIn: String,
  phone: String,
  // Candidate specific fields
  resumeUrl: String,
  skills: [String],
  experience: String, // Can be string or array
  experienceYears: Number,
  currentRole: String,
  location: String,
  education: String, // Can be string or array
  github: String,
  languages: [String],
  summary: String,
  rawResumeText: String,
  resumeScore: Number,
  scoreBreakdown: {
    skillsScore: Number,
    experienceScore: Number,
    grammarScore: Number,
    completenessScore: Number,
    skillMatchPercentage: Number
  },
  // Recruiter specific fields
  companyName: String,
  companyLogo: String,
  contactInfo: String,
  panelMembers: [{
    name: String,
    email: String,
    designation: String,
    role: String
  }],
  shortlistedProfiles: [String],
  // Wallet balance (shared by both roles)
  walletBalance: { type: Number, default: 0 },
  // Payment cards
  paymentCards: [{
    id: String,
    last4: String,
    brand: String,
    holder: String,
    expiry: String
  }],
  primaryCardId: String
}, { timestamps: true });

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ companyId: 1 });
userSchema.index({ tenantId: 1 });
userSchema.index({ createdBy: 1 });
userSchema.index({ 'skills': 1 });
userSchema.index({ location: 1 });
userSchema.index({ experienceYears: 1 });
userSchema.index({ resumeScore: -1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  if (!this.password) {
    return false;
  }
  if (!password) {
    return false;
  }
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
