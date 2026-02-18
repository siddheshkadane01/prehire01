const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check if user has admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Middleware to check if user has tenant role
const requireTenant = (req, res, next) => {
  if (!req.user || req.user.role !== 'tenant') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Tenant privileges required.'
    });
  }
  next();
};

// Middleware to check if user has recruiter role
const requireRecruiter = (req, res, next) => {
  if (!req.user || req.user.role !== 'recruiter') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Recruiter privileges required.'
    });
  }
  next();
};

// Middleware to check if user has candidate role
const requireCandidate = (req, res, next) => {
  if (!req.user || req.user.role !== 'candidate') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Candidate privileges required.'
    });
  }
  next();
};

// Middleware to check company access (for data isolation)
const checkCompanyAccess = async (req, res, next) => {
  try {
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Get company from request params or query
    const companyId = req.params.companyId || req.query.companyId || req.body.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    // Check if user belongs to the company
    if (req.user.role === 'tenant') {
      const company = await Company.findOne({ _id: companyId, tenantId: req.user.userId });
      if (!company) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this company'
        });
      }
    } else if (req.user.role === 'recruiter') {
      const user = await User.findById(req.user.userId);
      if (!user || user.companyId?.toString() !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this company'
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking company access',
      error: error.message
    });
  }
};

module.exports = auth;
module.exports.requireAdmin = requireAdmin;
module.exports.requireTenant = requireTenant;
module.exports.requireRecruiter = requireRecruiter;
module.exports.requireCandidate = requireCandidate;
module.exports.checkCompanyAccess = checkCompanyAccess;