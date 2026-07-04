const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const chatbotService = require('../services/chatbotService');

const router = express.Router();

router.post(
  '/message',
  [
    body('question').trim().notEmpty().withMessage('Question is required.')
  ],
  validate,
  async (req, res, next) => {
    try {
      const { question } = req.body;

      const result = await chatbotService.findBestMatch(question);

      if (result) {
        res.status(200).json({
          source: result.source,
          answer: result.answer,
          response: result.answer,
          title: result.title,
          matched: result.matched
        });
      } else {
        res.status(200).json({
          source: 'fallback',
          response: "I am not sure about that. Here are some things I can help you with! Try asking about earning points, redeeming points, point value, signup process, or contact support.",
          answer: "I am not sure about that. Here are some things I can help you with! Try asking about earning points, redeeming points, point value, signup process, or contact support.",
          matched: false,
          suggestions: [
            "How do I earn points?",
            "How do I redeem points?",
            "What is 1 point worth?",
            "How do I signup?",
            "How do I contact support?"
          ]
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;