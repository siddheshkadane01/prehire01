const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Company = require('../models/Company');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

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

// Middleware to require admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Get platform statistics
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      totalTenants,
      totalRecruiters,
      totalCandidates,
      totalJobs,
      activeJobs
    ] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'tenant' }),
      User.countDocuments({ role: 'recruiter' }),
      User.countDocuments({ role: 'candidate' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'active' })
    ]);

    res.json({
      success: true,
      stats: {
        companies: { total: totalCompanies, active: activeCompanies },
        users: {
          tenants: totalTenants,
          recruiters: totalRecruiters,
          candidates: totalCandidates
        },
        jobs: { total: totalJobs, active: activeJobs }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Get all tenants with their companies
router.get('/tenants', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = { role: 'tenant' };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const [tenants, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter)
    ]);

    // Get company details for each tenant
    const tenantsWithCompanies = await Promise.all(
      tenants.map(async (tenant) => {
        const company = await Company.findOne({ tenantId: tenant._id });
        const recruiterCount = await User.countDocuments({
          tenantId: tenant._id,
          role: 'recruiter'
        });
        return {
          ...tenant,
          company,
          recruiterCount
        };
      })
    );

    res.json({
      success: true,
      tenants: tenantsWithCompanies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: skip + tenants.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenants',
      error: error.message
    });
  }
});

// Get single tenant details
router.get('/tenants/:id', auth, requireAdmin, [
  param('id').isMongoId().withMessage('Invalid tenant ID')
], validate, async (req, res) => {
  try {
    const tenant = await User.findOne({ _id: req.params.id, role: 'tenant' })
      .select('-password');

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    const [company, recruiters] = await Promise.all([
      Company.findOne({ tenantId: tenant._id }),
      User.find({ tenantId: tenant._id, role: 'recruiter' }).select('-password')
    ]);

    res.json({
      success: true,
      tenant: {
        ...tenant.toObject(),
        company,
        recruiters
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant details',
      error: error.message
    });
  }
});

// Create new tenant and company
router.post('/tenants', auth, requireAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  body('companyWebsite').optional().isURL().withMessage('Invalid website URL'),
  body('industry').optional().trim()
], validate, async (req, res) => {
  try {
    const { name, email, password, phone, companyName, companyWebsite, industry, companyDescription } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create tenant user
    const tenant = new User({
      name,
      email: email.toLowerCase().trim(),
      password,
      phone,
      role: 'tenant',
      createdBy: req.user.userId
    });

    await tenant.save();

    // Create company
    const company = new Company({
      name: companyName,
      website: companyWebsite,
      industry,
      description: companyDescription,
      tenantId: tenant._id,
      contactEmail: email,
      contactPhone: phone
    });

    await company.save();

    // Update tenant with companyId
    tenant.companyId = company._id;
    await tenant.save();

    res.status(201).json({
      success: true,
      message: 'Tenant and company created successfully',
      tenant: {
        id: tenant._id,
        name: tenant.name,
        email: tenant.email,
        role: tenant.role
      },
      company: {
        id: company._id,
        name: company.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create tenant',
      error: error.message
    });
  }
});

// Update tenant
router.put('/tenants/:id', auth, requireAdmin, [
  param('id').isMongoId().withMessage('Invalid tenant ID'),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().trim()
], validate, async (req, res) => {
  try {
    const tenant = await User.findOne({ _id: req.params.id, role: 'tenant' });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Update allowed fields
    const allowedFields = ['name', 'email', 'phone'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'email') {
          tenant[field] = req.body[field].toLowerCase().trim();
        } else {
          tenant[field] = req.body[field];
        }
      }
    });

    await tenant.save();

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      tenant: {
        id: tenant._id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant',
      error: error.message
    });
  }
});

// Delete/deactivate tenant
router.delete('/tenants/:id', auth, requireAdmin, [
  param('id').isMongoId().withMessage('Invalid tenant ID')
], validate, async (req, res) => {
  try {
    const tenant = await User.findOne({ _id: req.params.id, role: 'tenant' });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Soft delete: deactivate tenant and company
    const company = await Company.findOne({ tenantId: tenant._id });
    if (company) {
      company.status = 'inactive';
      await company.save();
    }

    // Deactivate all recruiters under this tenant
    await User.updateMany(
      { tenantId: tenant._id },
      { $set: { status: 'inactive' } }
    );

    // Delete tenant
    await tenant.deleteOne();

    res.json({
      success: true,
      message: 'Tenant and associated company deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete tenant',
      error: error.message
    });
  }
});

// Get all companies
router.get('/companies', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (status) filter.status = status;

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .populate('tenantId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Company.countDocuments(filter)
    ]);

    res.json({
      success: true,
      companies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error.message
    });
  }
});

// Update company
router.put('/companies/:id', auth, requireAdmin, [
  param('id').isMongoId().withMessage('Invalid company ID')
], validate, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    Object.assign(company, req.body);
    await company.save();

    res.json({
      success: true,
      message: 'Company updated successfully',
      company
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: error.message
    });
  }
});

module.exports = router;
