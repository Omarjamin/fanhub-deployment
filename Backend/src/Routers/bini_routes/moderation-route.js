import { Router } from 'express';
import { moderateContent } from '../../core/moderation.js';

const router = Router();

/**
 * POST /api/bini/moderate
 * Test endpoint for content moderation
 * Body: { "text": "sample content" }
 */
router.post('/moderate', async (req, res) => {
  try {
    const { text } = req.body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid input. Text field is required and must be a string.',
      });
    }

    // Call moderation function directly from core
    const moderationResult = await moderateContent(text);

    // Return moderation result
    res.json(moderationResult);
  } catch (error) {
    console.error('Moderation endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error during content moderation',
    });
  }
});

export default router;
