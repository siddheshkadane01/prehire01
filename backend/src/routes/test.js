// src/routes/test.js

const express = require('express');
const auth = require('../middleware/auth');
const {
  fetchAllQuestions,
  fetchQuestionsByTraits,
  generateBalancedTest,
  fetchAvailableTraits,
} = require('../services/testService');

const router = express.Router();

/**
 * GET /api/test/traits
 * Returns all available traits from the questions table
 */
router.get('/traits', auth, async (req, res) => {
  try {
    const traits = await fetchAvailableTraits();
    res.json({ success: true, traits });
  } catch (error) {
    console.error('Failed to fetch traits:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch traits', error: error.message });
  }
});

/**
 * GET /api/test/questions
 * Fetch all questions (optionally filter by traits via query param)
 * Query: ?traits=EXT,EST
 */
router.get('/questions', auth, async (req, res) => {
  try {
    const traits = req.query.traits
      ? req.query.traits.split(',').map((t) => t.trim())
      : [];

    const questions = await fetchQuestionsByTraits(traits);
    res.json({ success: true, total: questions.length, questions });
  } catch (error) {
    console.error('Failed to fetch questions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch questions', error: error.message });
  }
});

/**
 * POST /api/test/generate
 * Generate a balanced, randomized test
 * Body: { totalQuestions: 20, traits: [] }
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const { totalQuestions = 20, traits = [] } = req.body;

    if (typeof totalQuestions !== 'number' || totalQuestions < 1 || totalQuestions > 100) {
      return res.status(400).json({
        success: false,
        message: 'totalQuestions must be a number between 1 and 100',
      });
    }

    if (!Array.isArray(traits)) {
      return res.status(400).json({
        success: false,
        message: 'traits must be an array of strings',
      });
    }

    const test = await generateBalancedTest(totalQuestions, traits);

    res.json({
      success: true,
      message: 'Test generated successfully',
      ...test,
    });
  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/test/submit — Deprecated
 * Use POST /api/psychometric/submit instead
 */
router.post('/submit', auth, async (req, res) => {
  return res.status(301).json({
    success: false,
    message: 'Use POST /api/psychometric/submit for Likert-based scoring.',
  });
});

module.exports = router;