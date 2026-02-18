const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');
const atsScoringService = require('../services/atsScoringService');

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

// Create job posting
router.post(
  '/',
  auth,
  [
    body('title').trim().notEmpty().withMessage('Job title is required'),
    body('description').trim().notEmpty().withMessage('Job description is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('workplaceType').isIn(['remote', 'onsite', 'hybrid']).withMessage('Invalid workplace type'),
    body('requirements.skills').optional().isArray().withMessage('Skills must be an array'),
    body('salaryRange.min').optional().isNumeric().withMessage('Min salary must be a number'),
    body('salaryRange.max').optional().isNumeric().withMessage('Max salary must be a number')
  ],
  validate,
  async (req, res) => {
    try {
      if (req.user.role !== 'recruiter') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      // Get recruiter's company
      const recruiter = await User.findById(req.user.userId);
      if (!recruiter || !recruiter.companyId) {
        return res.status(400).json({
          success: false,
          message: 'Recruiter must be associated with a company'
        });
      }

      const jobData = {
        recruiterId: req.user.userId,
        companyId: recruiter.companyId,
        title: req.body.title,
        description: req.body.description,
        location: req.body.location,
        workplaceType: req.body.workplaceType,
        requirements: req.body.requirements || {},
        salaryRange: req.body.salaryRange,
        status: req.body.status || 'active'
      };

      const job = new Job(jobData);
      await job.save();

      res.status(201).json({
        success: true,
        message: 'Job posted successfully',
        job
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create job',
        error: error.message
      });
    }
  }
);

// Get all jobs (for recruiters - their company jobs, for candidates - all active jobs)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, location, workplaceType } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};

    if (req.user.role === 'recruiter') {
      // Get recruiter's company and show only their company's jobs
      const recruiter = await User.findById(req.user.userId);
      if (recruiter && recruiter.companyId) {
        filter.companyId = recruiter.companyId;
      } else {
        filter.recruiterId = req.user.userId;
      }
      if (status) filter.status = status;
    } else if (req.user.role === 'tenant') {
      // Tenant sees all jobs from their company
      const Company = require('../models/Company');
      const company = await Company.findOne({ tenantId: req.user.userId });
      if (company) {
        filter.companyId = company._id;
      }
      if (status) filter.status = status;
    } else {
      // Candidates see only active jobs
      filter.status = 'active';
    }

    if (location) filter.location = new RegExp(location, 'i');
    if (workplaceType) filter.workplaceType = workplaceType;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate('recruiterId', 'name companyName companyLogo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Job.countDocuments(filter)
    ]);

    res.json({
      success: true,
      jobs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: skip + jobs.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
});

// Get single job
router.get(
  '/:id',
  auth,
  [param('id').isMongoId().withMessage('Invalid job ID')],
  validate,
  async (req, res) => {
    try {
      const job = await Job.findById(req.params.id)
        .populate('recruiterId', 'name companyName companyLogo contactInfo')
        .populate('applications.candidateId', 'name email photo currentRole experienceYears');

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Increment views
      job.views += 1;
      await job.save();

      res.json({
        success: true,
        job
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch job',
        error: error.message
      });
    }
  }
);

// Update job
router.put(
  '/:id',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid job ID'),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('status').optional().isIn(['draft', 'active', 'closed', 'paused'])
  ],
  validate,
  async (req, res) => {
    try {
      if (req.user.role !== 'recruiter') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const job = await Job.findById(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      if (job.recruiterId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own jobs'
        });
      }

      Object.assign(job, req.body);
      await job.save();

      res.json({
        success: true,
        message: 'Job updated successfully',
        job
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update job',
        error: error.message
      });
    }
  }
);

// Delete job
router.delete(
  '/:id',
  auth,
  [param('id').isMongoId().withMessage('Invalid job ID')],
  validate,
  async (req, res) => {
    try {
      if (req.user.role !== 'recruiter') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const job = await Job.findById(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      if (job.recruiterId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own jobs'
        });
      }

      await job.deleteOne();

      res.json({
        success: true,
        message: 'Job deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete job',
        error: error.message
      });
    }
  }
);

// Apply to job
router.post(
  '/:id/apply',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid job ID'),
    body('notes').optional().trim()
  ],
  validate,
  async (req, res) => {
    try {
      if (req.user.role !== 'candidate') {
        return res.status(403).json({
          success: false,
          message: 'Only candidates can apply to jobs'
        });
      }

      const job = await Job.findById(req.params.id)
        .populate('recruiterId', 'name email companyName');

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      if (job.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'This job is not accepting applications'
        });
      }

      // Check if already applied
      const existingApplication = job.applications.find(
        app => app.candidateId.toString() === req.user.userId
      );

      if (existingApplication) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied to this job'
        });
      }

      // Get candidate profile for ATS scoring
      const candidate = await User.findById(req.user.userId);
      const jobDescription = `${job.title}. ${job.description}. ${job.requirements.skills?.join(', ') || ''}`;
      
      const atsScore = atsScoringService.calculateDetailedATSScore(
        {
          name: candidate.name,
          skills: candidate.skills || [],
          experience: candidate.experience || '',
          education: candidate.education || '',
          experienceYears: candidate.experienceYears || 0,
          summary: candidate.summary || '',
          rawResumeText: candidate.rawResumeText || ''
        },
        jobDescription
      );

      // Add application
      job.applications.push({
        candidateId: req.user.userId,
        status: 'pending',
        atsScore: atsScore.overallScore,
        notes: req.body.notes
      });

      job.applicationCount += 1;
      await job.save();

      // Create notification for recruiter
      await Notification.create({
        userId: job.recruiterId._id,
        type: 'application_received',
        title: 'New Application Received',
        message: `${candidate.name} applied for ${job.title}`,
        metadata: {
          candidateId: candidate._id,
          jobId: job._id,
          link: `/recruiter/jobs/${job._id}`
        }
      });

      // Send email to recruiter
      await emailService.sendApplicationReceivedEmail(
        job.recruiterId.email,
        job.recruiterId.name,
        candidate.name,
        job.title
      );

      // Create notification for candidate
      await Notification.create({
        userId: req.user.userId,
        type: 'application_status_update',
        title: 'Application Submitted',
        message: `Your application for ${job.title} has been submitted`,
        metadata: {
          jobId: job._id,
          link: `/candidate`
        }
      });

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        application: {
          jobId: job._id,
          jobTitle: job.title,
          atsScore: atsScore.overallScore,
          status: 'pending'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to submit application',
        error: error.message
      });
    }
  }
);

// Get matched candidates for a job (for recruiters)
router.get(
  '/:id/matches',
  auth,
  [param('id').isMongoId().withMessage('Invalid job ID')],
  validate,
  async (req, res) => {
    try {
      if (req.user.role !== 'recruiter') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const job = await Job.findById(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      if (job.recruiterId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Build filter based on job requirements
      let filter = { role: 'candidate' };

      if (job.requirements.skills && job.requirements.skills.length > 0) {
        filter.skills = { $in: job.requirements.skills.map(s => new RegExp(s, 'i')) };
      }

      if (job.requirements.experienceYears) {
        if (job.requirements.experienceYears.min) {
          filter.experienceYears = { $gte: job.requirements.experienceYears.min };
        }
        if (job.requirements.experienceYears.max) {
          filter.experienceYears = {
            ...filter.experienceYears,
            $lte: job.requirements.experienceYears.max
          };
        }
      }

      if (job.location && job.location !== 'remote') {
        filter.location = new RegExp(job.location, 'i');
      }

      const candidates = await User.find(filter)
        .select('-password')
        .limit(50);

      // Calculate ATS scores for each candidate
      const jobDescription = `${job.title}. ${job.description}. ${job.requirements.skills?.join(', ') || ''}`;
      
      const candidatesWithScores = candidates.map(candidate => {
        const atsScore = atsScoringService.calculateDetailedATSScore(
          {
            name: candidate.name,
            skills: candidate.skills || [],
            experience: candidate.experience || '',
            education: candidate.education || '',
            experienceYears: candidate.experienceYears || 0,
            summary: candidate.summary || '',
            rawResumeText: candidate.rawResumeText || ''
          },
          jobDescription
        );

        return {
          ...candidate.toObject(),
          matchScore: atsScore.overallScore,
          matchBreakdown: atsScore
        };
      });

      // Sort by match score
      candidatesWithScores.sort((a, b) => b.matchScore - a.matchScore);

      res.json({
        success: true,
        candidates: candidatesWithScores,
        jobTitle: job.title
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch matches',
        error: error.message
      });
    }
  }
);

// Update application status
router.put(
  '/:id/applications/:applicationId',
  auth,
  [
    param('id').isMongoId().withMessage('Invalid job ID'),
    param('applicationId').isMongoId().withMessage('Invalid application ID'),
    body('status').isIn(['pending', 'shortlisted', 'rejected', 'withdrawn']).withMessage('Invalid status'),
    body('notes').optional().trim()
  ],
  validate,
  async (req, res) => {
    try {
      if (req.user.role !== 'recruiter') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const job = await Job.findById(req.params.id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      if (job.recruiterId.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const application = job.applications.id(req.params.applicationId);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }

      application.status = req.body.status;
      if (req.body.notes) application.notes = req.body.notes;

      await job.save();

      // Get candidate info
      const candidate = await User.findById(application.candidateId);

      // Create notification for candidate
      await Notification.create({
        userId: application.candidateId,
        type: 'application_status_update',
        title: 'Application Status Updated',
        message: `Your application for ${job.title} has been ${req.body.status}`,
        metadata: {
          jobId: job._id,
          link: `/candidate`
        }
      });

      // Send email to candidate
      await emailService.sendApplicationStatusUpdateEmail(
        candidate.email,
        candidate.name,
        job.title,
        req.body.status
      );

      res.json({
        success: true,
        message: 'Application status updated',
        application
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update application',
        error: error.message
      });
    }
  }
);

module.exports = router;
