const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Get candidate profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user || user.role !== 'candidate') {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update candidate profile
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      name,
      photo,
      linkedIn,
      phone,
      skills,
      experience,
      currentRole,
      education,
      location,
      experienceYears,
      email,
      github,
      languages,
      summary
    } = req.body;

    // Filter out undefined values
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (photo !== undefined) updateData.photo = photo;
    if (linkedIn !== undefined) updateData.linkedIn = linkedIn;
    if (phone !== undefined) updateData.phone = phone;
    if (skills !== undefined) updateData.skills = skills;
    if (experience !== undefined) updateData.experience = experience;
    if (currentRole !== undefined) updateData.currentRole = currentRole;
    if (education !== undefined) updateData.education = education;
    if (location !== undefined) updateData.location = location;
    if (github !== undefined) updateData.github = github;
    if (languages !== undefined) updateData.languages = languages;
    if (summary !== undefined) updateData.summary = summary;
    if (experienceYears !== undefined) {
      const parsedYears = Number(experienceYears);
      if (!Number.isNaN(parsedYears)) {
        updateData.experienceYears = parsedYears;
      }
    }

    console.log('Updating profile with:', updateData);

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user || user.role !== 'candidate') {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    console.log('Updated user:', user);
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
});

// Update parsed resume data
router.put('/resume-data', auth, async (req, res) => {
  try {
    const {
      name, email, phone, skills, experience, education, resumeScore, scoreBreakdown,
      experienceYears, linkedin, github, languages, summary, rawResumeText
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    // Don't update email from resume parse as it's a unique identifier/login credential
    // if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (skills !== undefined) updateData.skills = skills;
    if (experience !== undefined) updateData.experience = experience;
    if (education !== undefined) updateData.education = education;
    if (resumeScore !== undefined) updateData.resumeScore = resumeScore;
    if (scoreBreakdown !== undefined) updateData.scoreBreakdown = scoreBreakdown;
    if (experienceYears !== undefined) updateData.experienceYears = experienceYears;
    if (linkedin !== undefined) updateData.linkedIn = linkedin;
    if (github !== undefined) updateData.github = github;
    if (languages !== undefined) updateData.languages = languages;
    if (summary !== undefined) updateData.summary = summary;
    if (rawResumeText !== undefined) updateData.rawResumeText = rawResumeText;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
});

// Calculate ATS score
router.post('/ats-score', auth, async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ message: 'Job description is required' });
    }

    const atsScoringService = require('../services/atsScoringService');
    const user = await User.findById(req.user.userId).select('-password');

    if (!user || user.role !== 'candidate') {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const profile = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      skills: user.skills || [],
      experience: user.experience || '',
      education: user.education || '',
      experienceYears: user.experienceYears || 0,
      currentRole: user.currentRole || '',
      summary: user.summary || '',
      rawResumeText: user.rawResumeText || ''
    };

    const atsScore = atsScoringService.calculateDetailedATSScore(profile, jobDescription);

    res.json(atsScore);
  } catch (error) {
    console.error('ATS score calculation error:', error);
    res.status(500).json({ message: 'ATS score calculation failed', error: error.message });
  }
});

// Update wallet balance
router.put('/wallet-balance', auth, async (req, res) => {
  try {
    const { amount, operation = 'add' } = req.body; // operation: 'add' or 'set'

    if (amount === undefined || amount < 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'candidate') {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const currentBalance = user.walletBalance || 0;
    const newBalance = operation === 'add'
      ? currentBalance + amount
      : amount;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { walletBalance: newBalance },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Wallet balance updated successfully',
      walletBalance: updatedUser.walletBalance,
      user: updatedUser
    });
  } catch (error) {
    console.error('Wallet balance update error:', error);
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
});

// Remove stored resume
router.delete('/resume', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'candidate') {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (!user.resumeUrl) {
      return res.status(400).json({ message: 'No resume to remove' });
    }

    if (process.env.USE_S3 !== 'true') {
      const filePath = path.join(__dirname, '../../..', user.resumeUrl);
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.warn('Failed to delete resume file:', err.message);
        }
      });
    }

    user.resumeUrl = undefined;
    await user.save();

    res.json({ message: 'Resume removed successfully' });
  } catch (error) {
    console.error('Resume removal error:', error);
    res.status(500).json({ message: 'Failed to remove resume', error: error.message });
  }
});

// Get candidate applications
router.get('/applications', auth, async (req, res) => {
  try {
    const Job = require('../models/Job');
    
    // Find all jobs where this candidate has applied
    const jobs = await Job.find({
      'applications.candidateId': req.user.userId
    })
    .populate('companyId', 'name logo')
    .select('title location workplaceType applications companyId createdAt')
    .sort({ createdAt: -1 });
    
    // Extract only this candidate's application from each job
    const applications = jobs.map(job => {
      const application = job.applications.find(
        app => app.candidateId.toString() === req.user.userId
      );
      
      return {
        _id: application._id,
        jobId: {
          _id: job._id,
          title: job.title,
          location: job.location,
          workplaceType: job.workplaceType,
          companyId: job.companyId
        },
        status: application.status,
        appliedAt: application.appliedAt,
        matchScore: application.matchScore,
        interviewHistory: application.interviewHistory || []
      };
    });
    
    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch applications', 
      error: error.message 
    });
  }
});

module.exports = router;
