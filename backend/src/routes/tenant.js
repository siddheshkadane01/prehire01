const express = require('express');
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const auth = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Middleware to require tenant role
const requireTenant = (req, res, next) => {
  if (req.user.role !== 'tenant') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Tenant privileges required.'
    });
  }
  next();
};

// Get tenant dashboard stats
router.get('/dashboard', auth, requireTenant, async (req, res) => {
  try {
    const company = await Company.findOne({ tenantId: req.user.userId });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const [recruiters, activeJobs, totalApplications] = await Promise.all([
      User.countDocuments({ tenantId: req.user.userId, role: 'recruiter' }),
      Job.countDocuments({ companyId: company._id, status: 'active' }),
      Job.aggregate([
        { $match: { companyId: company._id } },
        { $group: { _id: null, total: { $sum: '$applicationCount' } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        recruiters,
        activeJobs,
        totalApplications: totalApplications[0]?.total || 0,
        company: {
          name: company.name,
          subscription: company.subscription
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
});

// Get company profile
router.get('/company', auth, requireTenant, async (req, res) => {
  try {
    const company = await Company.findOne({ tenantId: req.user.userId })
      .populate('tenantId', 'name email phone');

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      company
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company profile',
      error: error.message
    });
  }
});

// Update company profile
router.put('/company', auth, requireTenant, [
  body('name').optional().trim().notEmpty(),
  body('website').optional().isURL(),
  body('industry').optional().trim(),
  body('description').optional().trim()
], validate, async (req, res) => {
  try {
    const company = await Company.findOne({ tenantId: req.user.userId });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Update allowed fields
    const allowedFields = ['name', 'logo', 'website', 'industry', 'description', 
                          'contactEmail', 'contactPhone', 'address', 'settings'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        company[field] = req.body[field];
      }
    });

    await company.save();

    res.json({
      success: true,
      message: 'Company profile updated successfully',
      company
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update company profile',
      error: error.message
    });
  }
});

// Get all recruiters under this tenant
router.get('/recruiters', auth, requireTenant, async (req, res) => {
  try {
    const recruiters = await User.find({
      tenantId: req.user.userId,
      role: 'recruiter'
    }).select('-password').sort({ createdAt: -1 });

    // Get job count for each recruiter
    const recruitersWithStats = await Promise.all(
      recruiters.map(async (recruiter) => {
        const jobCount = await Job.countDocuments({ recruiterId: recruiter._id });
        return {
          ...recruiter.toObject(),
          jobCount
        };
      })
    );

    res.json({
      success: true,
      recruiters: recruitersWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recruiters',
      error: error.message
    });
  }
});

// Add a new recruiter
router.post('/recruiters', auth, requireTenant, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
  body('designation').optional().trim()
], validate, async (req, res) => {
  try {
    const { name, email, password, phone, designation } = req.body;

    // Get tenant's company
    const company = await Company.findOne({ tenantId: req.user.userId });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check subscription limits
    const currentRecruiters = await User.countDocuments({
      tenantId: req.user.userId,
      role: 'recruiter'
    });

    if (currentRecruiters >= company.subscription.recruiterLimit) {
      return res.status(403).json({
        success: false,
        message: `Recruiter limit reached. Your plan allows ${company.subscription.recruiterLimit} recruiters.`
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create recruiter user
    const recruiter = new User({
      name,
      email: email.toLowerCase().trim(),
      password,
      phone,
      role: 'recruiter',
      companyId: company._id,
      tenantId: req.user.userId,
      createdBy: req.user.userId,
      companyName: company.name,
      contactInfo: designation || 'Recruiter'
    });

    await recruiter.save();

    // Update company stats
    company.stats.totalRecruiters += 1;
    await company.save();

    res.status(201).json({
      success: true,
      message: 'Recruiter added successfully',
      recruiter: {
        id: recruiter._id,
        name: recruiter.name,
        email: recruiter.email,
        phone: recruiter.phone,
        role: recruiter.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add recruiter',
      error: error.message
    });
  }
});

// Update recruiter
router.put('/recruiters/:id', auth, requireTenant, [
  param('id').isMongoId().withMessage('Invalid recruiter ID'),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().trim()
], validate, async (req, res) => {
  try {
    const recruiter = await User.findOne({
      _id: req.params.id,
      tenantId: req.user.userId,
      role: 'recruiter'
    });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found'
      });
    }

    // Update allowed fields
    const allowedFields = ['name', 'email', 'phone', 'contactInfo'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'email') {
          recruiter[field] = req.body[field].toLowerCase().trim();
        } else {
          recruiter[field] = req.body[field];
        }
      }
    });

    await recruiter.save();

    res.json({
      success: true,
      message: 'Recruiter updated successfully',
      recruiter: {
        id: recruiter._id,
        name: recruiter.name,
        email: recruiter.email,
        phone: recruiter.phone
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update recruiter',
      error: error.message
    });
  }
});

// Delete recruiter
router.delete('/recruiters/:id', auth, requireTenant, [
  param('id').isMongoId().withMessage('Invalid recruiter ID')
], validate, async (req, res) => {
  try {
    const recruiter = await User.findOne({
      _id: req.params.id,
      tenantId: req.user.userId,
      role: 'recruiter'
    });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found'
      });
    }

    await recruiter.deleteOne();

    // Update company stats
    const company = await Company.findOne({ tenantId: req.user.userId });
    if (company) {
      company.stats.totalRecruiters = Math.max(0, company.stats.totalRecruiters - 1);
      await company.save();
    }

    res.json({
      success: true,
      message: 'Recruiter removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete recruiter',
      error: error.message
    });
  }
});

// Get all jobs from company
router.get('/jobs', auth, requireTenant, async (req, res) => {
  try {
    const company = await Company.findOne({ tenantId: req.user.userId });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const jobs = await Job.find({ companyId: company._id })
      .populate('recruiterId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
});

module.exports = router;
