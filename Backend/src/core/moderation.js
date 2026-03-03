//  import OpenAI from 'openai';

// // Initialize OpenAI client with API key from environment
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// /**
//  * Moderate content using OpenAI's moderation API
//  * @param {string} text - The text content to moderate
//  * @returns {Object} Moderation result with risk level, flagged status, categories and scores
//  */
// export async function moderateContent(text) {
//   try {
//     // Send text to OpenAI moderation API using omni-moderation-latest model
//     const moderation = await openai.moderations.create({
//       model: 'omni-moderation-latest',
//       input: text,
//     });

//     const result = moderation.results[0];
//     const { categories, category_scores } = result;

//     // Calculate risk level based on category scores
//     let risk = 'safe';
//     let flagged = false;

//     // Check if any category score meets HIGH risk threshold (>= 0.75)
//     const highRiskCategories = Object.entries(category_scores).filter(
//       ([category, score]) => score >= 0.75
//     );

//     // Check if any category score meets MEDIUM risk threshold (>= 0.4 and < 0.75)
//     const mediumRiskCategories = Object.entries(category_scores).filter(
//       ([category, score]) => score >= 0.4 && score < 0.75
//     );

//     if (highRiskCategories.length > 0) {
//       risk = 'high';
//       flagged = true;
//     } else if (mediumRiskCategories.length > 0) {
//       risk = 'medium';
//       flagged = true;
//     }

//     return {
//       risk,
//       flagged,
//       categories,
//       scores: category_scores,
//     };
//   } catch (error) {
//     // Log error and return SAFE as fallback
//     console.error('OpenAI Moderation API error:', error.message || error);
//     return {
//       risk: 'safe',
//       flagged: false,
//       categories: {},
//       scores: {},
//     };
//   }
// }
import { pipeline } from '@xenova/transformers';

// Initialize the text classification pipeline for toxicity detection
let toxicityPipeline = null;

/** =========================
 * Rule-based toxic word lists
 * ========================= */

// English high severity
const highSeverityWordsEn = [
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'cunt', 'whore',
  'kill', 'die', 'murder', 'suicide', 'rape', 'slaughter', 'behead', 'stabbing',
  'choke', 'hang yourself', 'gun', 'shoot', 'terrorist',
  'faggot', 'motherfucker', 'cockroach', 'burn in hell',
  'kill yourself', 'die motherfucker', 'massacre', 'exterminate', 'lynch', 'assassinate', 'hang',
  'rapist', 'child molester', 'molest', 'genocide', 'terror attack', 'destroy', 'devastate',
  'smash your head', 'cut your throat', 'shoot you', 'stab you, bobo. tanga, fuck you, fck u, bobo, mabaho, panot'
];

// English medium severity
const mediumSeverityWordsEn = [
  'damn', 'hell', 'stupid', 'idiot', 'dumb', 'moron', 'crap',
  'garbage', 'trash', 'worthless', 'useless', 'bullshit', 'hate', 'loser',
  'jerk', 'fool', 'suck', 'annoying', 'shut up', 'dick', 'prick', 'ass',
  'ugly', 'retard', 'idiotic', 'lazy', 'nonsense', 'moronic', 'pissed off',
  'slut', 'twat', 'wanker', 'twatface', 'shithead', 'douche', 'clown',
  'ignorant', 'idiocy', 'scumbag', 'foolish', 'pathetic', 'losing',
  'hopeless', 'disgusting', 'jerkface', 'shitbag', 'bitchy', 'dumbass'
];

// Tagalog high severity
const highSeverityWordsTl = [
  'putang ina', 'pakshet', 'pakyu', 'papatayin kita', 'patayin kita',
  'susunugin kita', 'tutuklaw kita', 'papatayin kita lahat',
  'mamatay ka', 'magpakamatay ka', 'mamamatay ka', 'harapin mo ang kamatayan',
  'papatayin kita sa harap mo', 'nanay mo putang ina',
  'suntok sa mukha', 'sasaksakin kita', 'sasabog kita', 'susuntukin kita', 'papatayin kita ngayon'
];

// Tagalog medium severity
const mediumSeverityWordsTl = [
  'gago', 'tanga', 'ulol', 'bobo', 'baliw', 'loko', 'hangal', 'gaga', 'tarantado',
  'peste', 'tangina mo', 'putang ina mo', 'tangina', 'tangna', 'uwak', 'buwisit',
  'nakakainis', 'hindi marunong', 'hindi alam', 'kalokohan', 'siraulo',
  'tanginang gago', 'loko ka', 'hangal ka', 'uwak ka', 'ulol ka', 'baliw ka',
  'lintik', 'punyeta', 'leche', 'pucha', 'hinayupak', 'kupal',
  'animal', 'ungas', 'yawa', 'piste', 'pokpok', 'engot'
];

// Combine for simple detection
const highSeverityWords = [...highSeverityWordsEn, ...highSeverityWordsTl];
const mediumSeverityWords = [...mediumSeverityWordsEn, ...mediumSeverityWordsTl];

const hatePatterns = [
  /\bi\s+hate\s+you\b/i,
  /\bi\s+hate\s+\w+\b/i,
  /\bkill\s+yourself\b/i,
  /\bgo\s+die\b/i,
  /\bworthless\s+\w+\b/i,
  /\bstupid\s+\w+\b/i,
  /\bidiot\s+\w+\b/i
];

/** =========================
 * Rule-based moderation logic
 * ========================= */
function ruleBasedModeration(text) {
  const lowerText = text.toLowerCase();
  let toxicityScore = 0;

  const foundHigh = highSeverityWords.filter(word =>
    word.includes(' ') ? lowerText.includes(word) : lowerText.split(/\s+/).some(p => p.includes(word))
  );
  toxicityScore += foundHigh.length * 0.5;

  const foundMedium = mediumSeverityWords.filter(word =>
    word.includes(' ') ? lowerText.includes(word) : lowerText.split(/\s+/).some(p => p.includes(word))
  );
  toxicityScore += foundMedium.length * 0.3;

  const foundHate = hatePatterns.filter(pattern => pattern.test(text));
  toxicityScore += foundHate.length * 0.5;

  toxicityScore = Math.min(toxicityScore, 1.0);

  return {
    score: toxicityScore,
    flagged: toxicityScore >= 0.3,
    categories: {
      hate_speech: foundHate.length > 0,
      toxic: foundHigh.length > 0 || foundMedium.length > 0,
      profanity: foundHigh.length > 0 || foundMedium.length > 0
    },
    detected_high_severity: foundHigh,
    detected_medium_severity: foundMedium,
    detected_patterns: foundHate.length
  };
}

function buildModerationResponse({
  risk = 'safe',
  flagged = false,
  categories = {},
  scores = {},
  method = 'rule_based',
  detected_high_severity = [],
  detected_medium_severity = [],
  detected_patterns = 0,
}) {
  const detectedTerms = [
    ...new Set([
      ...(Array.isArray(detected_high_severity) ? detected_high_severity : []),
      ...(Array.isArray(detected_medium_severity) ? detected_medium_severity : []),
    ]),
  ];
  const blocked = Boolean(flagged && (risk === 'medium' || risk === 'high'));
  const warning = blocked ? 'Suspicious words detected. Please revise your post.' : '';

  return {
    risk,
    flagged,
    blocked,
    warning,
    categories,
    scores,
    method,
    detected_terms: detectedTerms,
    detected_patterns: Number(detected_patterns || 0),
  };
}

/** =========================
 * Xenova ML pipeline init
 * ========================= */
async function initializePipeline() {
  if (!toxicityPipeline) {
    try {
      toxicityPipeline = await pipeline('text-classification', 'microsoft/xtremedistil-l6-hate-speech', {
        device: 'cpu',
        local_files_only: false
      });
    } catch (err) {
      console.error('Failed to load ML model, using fallback:', err.message);
      toxicityPipeline = 'rule_based';
    }
  }
  return toxicityPipeline;
}

/** =========================
 * Main moderation function
 * ========================= */
export async function moderateContent(text) {
  console.log("MODERATION CALLED");
  try {
    const pipeline = await initializePipeline();

    // Use rule-based if ML pipeline failed
    if (pipeline === 'rule_based') {
      const ruleResult = ruleBasedModeration(text);
      let risk = 'safe';
      if (ruleResult.score >= 0.7) risk = 'high';
      else if (ruleResult.score >= 0.3) risk = 'medium';

      return buildModerationResponse({
        risk,
        flagged: ruleResult.flagged,
        categories: ruleResult.categories,
        scores: {
          hate_speech: ruleResult.score,
          toxic: ruleResult.score,
          non_toxic: 1 - ruleResult.score
        },
        method: 'rule_based',
        detected_high_severity: ruleResult.detected_high_severity,
        detected_medium_severity: ruleResult.detected_medium_severity,
        detected_patterns: ruleResult.detected_patterns,
      });
    }

    // Run ML model
    const results = await pipeline(text);
    console.log('ML Moderation Scores:', results);

    let risk = 'safe', flagged = false, categories = {}, scores = {};
    if (results && results.length > 0) {
      const { label, score } = results[0];
      let toxicityScore = (label === 'hate' || label === 'toxic') ? score : 1 - score;

      categories = {
        hate_speech: toxicityScore > 0.5,
        toxic: toxicityScore > 0.5,
        non_toxic: toxicityScore <= 0.5
      };
      scores = {
        hate_speech: toxicityScore,
        toxic: toxicityScore,
        non_toxic: 1 - toxicityScore
      };
      if (toxicityScore >= 0.7) { risk = 'high'; flagged = true; }
      else if (toxicityScore >= 0.3) { risk = 'medium'; flagged = true; }
    }

    return buildModerationResponse({
      risk,
      flagged,
      categories,
      scores,
      method: 'ml_model',
    });
  } catch (error) {
    console.error('Moderation failed, fallback to rule-based:', error.message);
    const ruleResult = ruleBasedModeration(text);
    let risk = 'safe';
    if (ruleResult.score >= 0.7) risk = 'high';
    else if (ruleResult.score >= 0.3) risk = 'medium';

    return buildModerationResponse({
      risk,
      flagged: ruleResult.flagged,
      categories: ruleResult.categories,
      scores: {
        hate_speech: ruleResult.score,
        toxic: ruleResult.score,
        non_toxic: 1 - ruleResult.score
      },
      method: 'rule_based_fallback',
      detected_high_severity: ruleResult.detected_high_severity,
      detected_medium_severity: ruleResult.detected_medium_severity,
      detected_patterns: ruleResult.detected_patterns,
    });
  }
}
