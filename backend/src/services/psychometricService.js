// src/services/psychometricService.js

const pool = require('./neonDb');

/**
 * Likert scale value map
 * Raw score (1–5) based on user response
 */
const LIKERT_VALUES = {
  'strongly agree': 5,
  'agree': 4,
  'neutral': 3,
  'disagree': 2,
  'strongly disagree': 1,
};

/**
 * Full trait names for Big Five
 */
const TRAIT_LABELS = {
  EXT: 'Extraversion',
  EST: 'Emotional Stability',
  AGR: 'Agreeableness',
  CSN: 'Conscientiousness',
  OPN: 'Openness',
};

/**
 * Apply Likert reverse scoring if direction is 'negative'
 * Formula: reversedScore = 6 - rawScore
 */
const applyReverseScoring = (rawScore, direction) => {
  if (direction === 'negative') {
    return 6 - rawScore;
  }
  return rawScore;
};

/**
 * Fetch variation details (trait + direction) for given question codes
 * @param {string[]} codes - Array of questionCodes like ['EXT1', 'EST3']
 */
const fetchVariationsByCode = async (codes) => {
  const result = await pool.query(
    `SELECT v."questionCode", q.trait, q.direction
FROM "Variation" v
JOIN "Question" q ON q.code = v."questionCode"
WHERE v."questionCode" = ANY($1::text[])`,
    [codes]
  );

  // Return as a map: { EXT1: { trait: 'EXT', direction: 'positive' }, ... }
  const map = {};
  result.rows.forEach((row) => {
    map[row.questionCode] = { trait: row.trait, direction: row.direction };
  });
  return map;
};

/**
 * Calculate Big Five psychometric scores from submitted answers
 *
 * @param {Array} answers - Array of { questionCode: 'EXT1', response: 'agree' }
 * @returns {Object} - Trait scores, percentages, and breakdown
 */
const calculatePsychometricScores = async (answers) => {
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error('answers array is required and must not be empty');
  }

  // Extract all question codes
  const codes = answers.map((a) => a.questionCode);

  // Fetch variation info from DB
  const variationMap = await fetchVariationsByCode(codes);

  const traitRaw = {};     // sum of scores per trait
  const traitCount = {};   // number of questions per trait
  const breakdown = [];

  for (const answer of answers) {
    const { questionCode, response } = answer;

    // Normalize response to lowercase
    const normalizedResponse = (response || '').trim().toLowerCase();
    const rawScore = LIKERT_VALUES[normalizedResponse];

    if (rawScore === undefined) {
      breakdown.push({
        questionCode,
        response,
        error: `Invalid response value: "${response}"`,
      });
      continue;
    }

    const variation = variationMap[questionCode];

    if (!variation) {
      breakdown.push({
        questionCode,
        response,
        error: `Question code not found in DB: "${questionCode}"`,
      });
      continue;
    }

    const { trait, direction } = variation;
    const finalScore = applyReverseScoring(rawScore, direction);

    // Accumulate
    if (!traitRaw[trait]) {
      traitRaw[trait] = 0;
      traitCount[trait] = 0;
    }
    traitRaw[trait] += finalScore;
    traitCount[trait]++;

    breakdown.push({
      questionCode,
      trait,
      direction,
      response: normalizedResponse,
      rawScore,
      finalScore,
    });
  }

  // Build trait summary
  const traitScores = {};
  for (const trait of Object.keys(traitRaw)) {
    const total = traitRaw[trait];
    const count = traitCount[trait];
    const maxPossible = count * 5;
    const percentage = Math.round((total / maxPossible) * 100);

    traitScores[trait] = {
      label: TRAIT_LABELS[trait] || trait,
      score: total,
      maxScore: maxPossible,
      questionsCount: count,
      percentage,
    };
  }

  return { traitScores, breakdown };
};

module.exports = {
  calculatePsychometricScores,
};
