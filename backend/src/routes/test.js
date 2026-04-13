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
 * Query: ?traits=logical,verbal
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
 * Body: { totalQuestions: 20, traits: ["logical", "verbal"] }
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
 * POST /api/test/submit
 * Submit answers and calculate score
 * Body: { answers: [{ questionId: 1, selectedAnswer: "A" }] }
 */
router.post('/submit', auth, async (req, res) => {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers) || !answers.length) {
      return res.status(400).json({ success: false, message: 'answers array is required' });
    }

    // Fetch correct answers for submitted question IDs
    const pool = require('../services/neonDb');
    const ids = answers.map((a) => a.questionId);
    const result = await pool.query(
      `SELECT id, correct_answer, trait FROM questions WHERE id = ANY($1::int[])`,
      [ids]
    );

    const correctMap = {};
    result.rows.forEach((row) => {
      correctMap[row.id] = { correctAnswer: row.correct_answer, trait: row.trait };
    });

    let totalScore = 0;
    const traitScores = {};
    const breakdown = answers.map((ans) => {
      const question = correctMap[ans.questionId];
      if (!question) return { questionId: ans.questionId, correct: false, trait: null };

      const isCorrect = ans.selectedAnswer === question.correctAnswer;
      if (isCorrect) totalScore++;

      const trait = question.trait || 'general';
      if (!traitScores[trait]) traitScores[trait] = { correct: 0, total: 0 };
      traitScores[trait].total++;
      if (isCorrect) traitScores[trait].correct++;

      return {
        questionId: ans.questionId,
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        trait,
      };
    });

    res.json({
      success: true,
      totalScore,
      totalQuestions: answers.length,
      percentage: Math.round((totalScore / answers.length) * 100),
      traitScores,
      breakdown,
    });
  } catch (error) {
    console.error('Test submission error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
