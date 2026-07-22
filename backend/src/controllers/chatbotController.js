const prisma = require('../lib/prisma');
const responses = require('../data/chatbot-responses.json');

async function handleChatMessage(req, res, next) {
  try {
    const { message, userRole = 'guest' } = req.body;
    const userId = req.user?.id || null;

    if (!message || typeof message !== 'string') {
      const err = new Error('Message is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const lowerMessage = message.toLowerCase().trim();
    let matched = false;
    let response = '';

    for (const entry of responses.responses) {
      if (entry.keywords && entry.keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
        response = entry.answer;
        matched = true;
        break;
      }
    }

    if (!matched) {
      response = "I am not sure about that. Here are some things I can help you with! Try asking about earning points, redeeming points, point value, signup process, or contact support.";
    }

    await prisma.chatLog.create({
      data: {
        message,
        response,
        userRole,
        userId: userId || null,
        matched
      }
    });

    res.status(200).json({
      response,
      matched,
      suggestions: [
        "How do I earn points?",
        "How do I redeem points?",
        "What is 1 point worth?",
        "How do I signup?",
        "How do I contact support?"
      ]
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleChatMessage
};
