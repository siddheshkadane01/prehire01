// src/routes/psychometric.js

const express = require('express');
const auth = require('../middleware/auth');
const { calculatePsychometricScores } = require('../services/psychometricService');

const router = express.Router();

/**
 * POST /api/psychometric/submit
 *
 * Accepts 20 answers with Likert responses,
 * applies reverse scoring based on question direction,
 * returns Big Five trait scores.
 *
 * Body:
 * {
 *   answers: [
 *     { questionCode: "EXT1", response: "agree" },
 *     { questionCode: "EST2", response: "strongly disagree" },
 *     ...
 *   ]
 * }
 *
 * Valid response values (case-insensitive):
 *   "strongly agree" | "agree" | "neutral" | "disagree" | "strongly disagree"
 */
router.post('/submit', auth, async (req, res) => {
  try {
    const { answers } = req.body;

    // Validation
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'answers must be a non-empty array',
      });
    }

    // Each answer must have questionCode and response
    const invalid = answers.filter(
      (a) => !a.questionCode || !a.response
    );
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Each answer must have questionCode and response',
        invalidEntries: invalid,
      });
    }

    // Calculate scores
    const { traitScores, breakdown } = await calculatePsychometricScores(answers);

    return res.json({
      success: true,
      totalAnswers: answers.length,
      traitScores,
      breakdown,
    });
  } catch (error) {
    console.error('Psychometric submission error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
