// src/services/testService.js

const pool = require('./neonDb');

/**
 * Fetch all questions from Neon DB
 * Table: "Question"(id, code, text, trait, direction)
 */
const fetchAllQuestions = async () => {
  const result = await pool.query(
    `SELECT id, code, text, trait, direction
     FROM "Question"
     ORDER BY id`
  );
  return result.rows;
};

/**
 * Fetch questions filtered by specific traits
 */
const fetchQuestionsByTraits = async (traits = []) => {
  if (!traits.length) return fetchAllQuestions();

  const result = await pool.query(
    `SELECT id, code, text, trait, direction
     FROM "Question"
     WHERE trait = ANY($1::text[])
     ORDER BY id`,
    [traits]
  );
  return result.rows;
};

/**
 * Group questions by their trait
 */
const groupByTrait = (questions) => {
  return questions.reduce((acc, question) => {
    const trait = question.trait || 'general';
    if (!acc[trait]) acc[trait] = [];
    acc[trait].push(question);
    return acc;
  }, {});
};

/**
 * Shuffle array (Fisher-Yates)
 */
const shuffle = (arr) => {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * Generate a balanced test:
 * - Equal questions from each trait
 * - Fully randomized order
 */
const generateBalancedTest = async (totalQuestions = 20, traits = []) => {
  const questions = await fetchQuestionsByTraits(traits);

  if (!questions.length) {
    throw new Error('No questions found for the given traits');
  }

  const grouped = groupByTrait(questions);
  const traitKeys = Object.keys(grouped);
  const perTrait = Math.floor(totalQuestions / traitKeys.length);
  const remainder = totalQuestions % traitKeys.length;

  let selected = [];

  traitKeys.forEach((trait, index) => {
    const pool = shuffle(grouped[trait]);
    const count = index < remainder ? perTrait + 1 : perTrait;
    selected.push(...pool.slice(0, count));
  });

  const finalTest = shuffle(selected);

  return {
    totalQuestions: finalTest.length,
    traits: traitKeys,
    questions: finalTest,
  };
};

/**
 * Fetch available traits (distinct)
 */
const fetchAvailableTraits = async () => {
  const result = await pool.query(
    `SELECT DISTINCT trait FROM "Question" 
     WHERE trait IS NOT NULL 
     ORDER BY trait`
  );
  return result.rows.map((r) => r.trait);
};

module.exports = {
  fetchAllQuestions,
  fetchQuestionsByTraits,
  generateBalancedTest,
  fetchAvailableTraits,
};