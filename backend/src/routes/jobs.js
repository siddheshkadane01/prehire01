const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');
const atsScoringService = require('../services/atsScoringService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');

// Handle both default and named exports of pdf-parse
const parsePDF = typeof pdfParse === 'function' ? pdfParse : pdfParse.default || pdfParse;

const router = express.Router();

// Get team members (recruiters in same company) - for building hiring teams
router.get('/team-members', auth, async (req, res) => {
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

    // Get all users (recruiters, managers, HR) from the same company
    const teamMembers = await User.find({
      companyId: recruiter.companyId,
      role: { $in: ['recruiter', 'tenant'] }
    }).select('name email role designation');

    res.json({
      success: true,
      teamMembers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
});

// Configure multer for JD PDF upload
const jdStorage = multer.memoryStorage();
const jdUpload = multer({
  storage: jdStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      return cb(new Error('Only PDF files are allowed for Job Descriptions'));
    }
    cb(null, true);
  }
});

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
    body('salaryRange.min').optional({ nullable: true, checkFalsy: true }).isNumeric().withMessage('Min salary must be a number'),
    body('salaryRange.max').optional({ nullable: true, checkFalsy: true }).isNumeric().withMessage('Max salary must be a number'),
    body('numberOfPositions').optional().isInt({ min: 1 }).withMessage('Number of positions must be at least 1'),
    body('numberOfRounds').optional().isInt({ min: 1 }).withMessage('Number of rounds must be at least 1')
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
        numberOfPositions: req.body.numberOfPositions || 1,
        numberOfRounds: req.body.numberOfRounds || 1,
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

// ========== NEW ROUTES FOR ENHANCED WORKFLOW ==========

// Set JD text manually (fallback when PDF extraction fails)
router.put('/:id/set-jd-text', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { jdText } = req.body;
    if (!jdText || jdText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'JD text is required' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Verify ownership
    if (job.recruiterId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Initialize jobDescriptionFile if it doesn't exist
    if (!job.jobDescriptionFile) {
      job.jobDescriptionFile = {};
    }

    job.jobDescriptionFile.extractedText = jdText;
    job.jobDescriptionFile.uploadedAt = new Date();
    job.jobDescriptionFile.filename = 'Manual Entry';
    
    await job.save();

    res.json({
      success: true,
      message: 'JD text saved successfully',
      textLength: jdText.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save JD text',
      error: error.message
    });
  }
});

// Upload Job Description PDF
router.post('/:id/upload-jd', auth, jdUpload.single('jd'), async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Verify ownership
    if (job.recruiterId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Save PDF file
    let fileUrl;
    const uploadDir = path.join(__dirname, '../../uploads/job-descriptions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `JD-${job._id}-${Date.now()}.pdf`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, req.file.buffer);
    fileUrl = `/uploads/job-descriptions/${filename}`;

    // Extract text from PDF
    let extractedText = '';
    try {
      console.log('Attempting to parse PDF...');
      const pdfData = await parsePDF(req.file.buffer);
      extractedText = pdfData.text || '';
      console.log('PDF parsed successfully. Text length:', extractedText.length);
      
      if (!extractedText || extractedText.trim().length === 0) {
        console.warn('PDF parsed but no text extracted. PDF might be image-based.');
      }
    } catch (error) {
      console.error('PDF parse error:', error);
      console.error('Error details:', error.stack);
      // Continue anyway - we'll save the file reference even if text extraction fails
    }

    // Update job with JD file info
    job.jobDescriptionFile = {
      url: fileUrl,
      filename: req.file.originalname,
      uploadedAt: new Date(),
      fileSize: req.file.size,
      extractedText: extractedText
    };

    await job.save();
    
    console.log('Job saved with JD file. Extracted text length:', extractedText.length);

    res.json({
      success: true,
      message: 'Job description uploaded successfully',
      fileUrl,
      extractedText: extractedText.substring(0, 500), // Preview
      textExtracted: extractedText.length > 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload JD',
      error: error.message
    });
  }
});

// Assign hiring team
router.put('/:id/hiring-team', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.recruiterId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { numberOfPositions, numberOfRounds, hiringManager, interviewPanel, hrContact } = req.body;

    // Update fields
    if (numberOfPositions) job.numberOfPositions = numberOfPositions;
    if (numberOfRounds) job.numberOfRounds = numberOfRounds;
    if (hiringManager) job.hiringManager = hiringManager;
    if (interviewPanel) job.interviewPanel = interviewPanel;
    if (hrContact) job.hrContact = hrContact;

    await job.save();

    res.json({
      success: true,
      message: 'Hiring team assigned successfully',
      job
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign hiring team',
      error: error.message
    });
  }
});

// AI suggest candidates based on JD
router.post('/:id/suggest-candidates', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    console.log('Suggest candidates - Job ID:', job._id);
    console.log('JD File exists:', !!job.jobDescriptionFile);
    console.log('Extracted text exists:', !!job.jobDescriptionFile?.extractedText);
    console.log('Extracted text length:', job.jobDescriptionFile?.extractedText?.length || 0);

    if (!job.jobDescriptionFile || !job.jobDescriptionFile.extractedText || job.jobDescriptionFile.extractedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload JD first. Text extraction from the PDF is required for AI matching.',
        debug: {
          hasJdFile: !!job.jobDescriptionFile,
          hasExtractedText: !!job.jobDescriptionFile?.extractedText,
          textLength: job.jobDescriptionFile?.extractedText?.length || 0
        }
      });
    }

    // Get all registered candidates
    const candidates = await User.find({ role: 'candidate' }).limit(200);

    // Calculate ATS scores for all candidates
    const scoredCandidates = [];
    for (const candidate of candidates) {
      const score = await atsScoringService.calculateDetailedATSScore(
        candidate,
        job.jobDescriptionFile.extractedText
      );
      
      if (score.score >= 60) { // Threshold
        scoredCandidates.push({
          candidateId: candidate._id,
          name: candidate.name,
          email: candidate.email,
          skills: candidate.skills,
          experience: candidate.experienceYears,
          matchScore: score.score,
          breakdown: score.breakdown
        });
      }
    }

    // Sort by score
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

    // Save top 50 as suggested candidates
    const topCandidates = scoredCandidates.slice(0, 50);
    job.suggestedCandidates = topCandidates.map(c => ({
      candidateId: c.candidateId,
      matchScore: c.matchScore,
      suggestedAt: new Date(),
      invited: false
    }));

    await job.save();

    res.json({
      success: true,
      message: `Found ${scoredCandidates.length} matching candidates`,
      suggestions: topCandidates,
      totalMatches: scoredCandidates.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to suggest candidates',
      error: error.message
    });
  }
});

// Get applications with filtering
router.get('/:id/applications', auth, async (req, res) => {
  try {
    const { status, minScore, maxScore, sortBy = 'atsScore', order = 'desc' } = req.query;

    const job = await Job.findById(req.params.id).populate('applications.candidateId', 'name email photo skills experienceYears');
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    let applications = job.applications;

    // Filter by status
    if (status) {
      applications = applications.filter(app => app.status === status);
    }

    // Filter by ATS score range
    if (minScore) {
      applications = applications.filter(app => app.atsScore >= parseFloat(minScore));
    }
    if (maxScore) {
      applications = applications.filter(app => app.atsScore <= parseFloat(maxScore));
    }

    // Sort
    applications.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return order === 'desc' ? bVal - aVal : aVal - bVal;
    });

    res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get applications',
      error: error.message
    });
  }
});

// Bulk update application status (shortlist/reject)
router.post('/:id/applications/bulk-update', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { candidateIds, newStatus, notes } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || !newStatus) {
      return res.status(400).json({
        success: false,
        message: 'candidateIds array and newStatus are required'
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    let updated = 0;
    for (const candidateId of candidateIds) {
      const application = job.applications.find(app => 
        app.candidateId.toString() === candidateId
      );

      if (application) {
        application.status = newStatus;
        if (notes) application.screeningNotes = notes;
        application.updatedAt = new Date();
        updated++;

        // Send notification
        await Notification.create({
          userId: candidateId,
          type: 'application_status_update',
          title: 'Application Status Updated',
          message: `Your application for ${job.title} has been ${newStatus}`,
          relatedId: job._id
        });
      }
    }

    await job.save();

    res.json({
      success: true,
      message: `Updated ${updated} applications`,
      updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update',
      error: error.message
    });
  }
});

// Send collection info request to shortlisted candidates
router.post('/:id/request-latest-info', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('applications.candidateId');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const shortlisted = job.applications.filter(app => app.status === 'shortlisted');

    let notified = 0;
    for (const app of shortlisted) {
      if (app.candidateId) {
        // Create notification
        await Notification.create({
          userId: app.candidateId._id,
          type: 'info_request',
          title: 'Update Your Information',
          message: `Please update your profile with latest information for ${job.title}`,
         relatedId: job._id
        });

        // Send email
        try {
          await emailService.sendApplicationStatusUpdateEmail(
            app.candidateId.email,
            app.candidateId.name,
            job.title,
            'Please update your profile information'
          );
        } catch (emailError) {
          console.error('Email error:', emailError);
        }

        notified++;
      }
    }

    res.json({
      success: true,
      message: `Info request sent to ${notified} candidates`,
      notified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send info request',
      error: error.message
    });
  }
});

// Schedule interview
router.post('/:id/applications/:candidateId/schedule-interview', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { round, interviewerId, interviewerName, scheduledDate } = req.body;

    const job = await Job.findById(req.params.id).populate('applications.candidateId');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const application = job.applications.find(app =>
      app.candidateId._id.toString() === req.params.candidateId
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Add interview to history
    application.interviewHistory.push({
      round,
      interviewer: interviewerId,
      interviewerName,
      scheduledDate: new Date(scheduledDate),
      status: 'scheduled'
    });

    application.status = 'interview_scheduled';
    application.currentRound = round;
    application.updatedAt = new Date();

    await job.save();

    // Notify candidate
    await Notification.create({
      userId: application.candidateId._id,
      type: 'interview_scheduled',
      title: 'Interview Scheduled',
      message: `Interview for ${job.title} - Round ${round} scheduled on ${new Date(scheduledDate).toLocaleDateString()}`,
      relatedId: job._id
    });

    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview',
      error: error.message
    });
  }
});

// Submit interview feedback
router.post('/:id/applications/:candidateId/interview-feedback', auth, async (req, res) => {
  try {
    const { round, feedback, rating, status } = req.body;

    const job = await Job.findById(req.params.id).populate('applications.candidateId');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const application = job.applications.find(app =>
      app.candidateId._id.toString() === req.params.candidateId
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Find the interview in history
    const interview = application.interviewHistory.find(int => int.round === round);
    if (interview) {
      interview.feedback = feedback;
      interview.rating = rating;
      interview.status = 'completed';
      interview.completedDate = new Date();
    }

    // Update application status
    if (status === 'passed') {
      if (round < job.numberOfRounds) {
        application.status = 'interview_completed';
      } else {
        // All rounds completed
        application.status = 'offer_extended';
      }
    } else {
      application.status = 'rejected';
    }

    application.updatedAt = new Date();
    await job.save();

    // Notify candidate
    await Notification.create({
      userId: application.candidateId._id,
      type: 'interview_feedback',
      title: 'Interview Update',
      message: `Interview Round ${round} for ${job.title} has been completed`,
      relatedId: job._id
    });

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
});

// Extend offer
router.post('/:id/applications/:candidateId/extend-offer', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const job = await Job.findById(req.params.id).populate('applications.candidateId');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const application = job.applications.find(app =>
      app.candidateId._id.toString() === req.params.candidateId
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    application.status = 'offer_extended';
    application.updatedAt = new Date();
    await job.save();

    // Notify candidate
    await Notification.create({
      userId: application.candidateId._id,
      type: 'offer_extended',
      title: 'Offer Extended!',
      message: `Congratulations! You have received an offer for ${job.title}`,
      relatedId: job._id
    });

    // Send email
    try {
      await emailService.sendApplicationStatusUpdateEmail(
        application.candidateId.email,
        application.candidateId.name,
        job.title,
        'Offer Extended'
      );
    } catch (emailError) {
      console.error('Email error:', emailError);
    }

    res.json({
      success: true,
      message: 'Offer extended successfully',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to extend offer',
      error: error.message
    });
  }
});

// Candidate accept/reject offer
router.post('/:id/applications/offer-response', auth, async (req, res) => {
  try {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { response } = req.body; // 'accept' or 'reject'

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const application = job.applications.find(app =>
      app.candidateId.toString() === req.user.userId
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.status !== 'offer_extended') {
      return res.status(400).json({
        success: false,
        message: 'No offer to respond to'
      });
    }

    application.status = response === 'accept' ? 'offer_accepted' : 'offer_rejected';
    if (response === 'accept') {
      application.status = 'hired';
    }
    application.updatedAt = new Date();
    await job.save();

    // Notify recruiter
    await Notification.create({
      userId: job.recruiterId,
      type: 'offer_response',
      title: 'Offer Response Received',
      message: `Candidate has ${response}ed the offer for ${job.title}`,
      relatedId: job._id
    });

    res.json({
      success: true,
      message: `Offer ${response}ed successfully`,
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to respond to offer',
      error: error.message
    });
  }
});

module.exports = router;
