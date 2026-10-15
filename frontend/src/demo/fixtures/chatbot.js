/**
 * Demo chatbot canned reply.
 * Mirrors POST /api/chatbot/message success shape
 * (backend/src/routes/chatbot.js:20-27 — flat top-level fields, NOT the
 * { success, data } envelope). FloatingChatbot reads
 * response|answer, matched, title, topics[], questions[]
 * (frontend/src/components/FloatingChatbot.jsx:102-110).
 */

export const DEMO_CHATBOT_REPLY = {
  source: 'demo-fixture',
  answer:
    'Welcome to the SkillXT demo! You earn 1 point for every ₹10 you spend at any partner store, and points can be redeemed for discounts — a 5% platform fee applies on redemption. Everything you see here is sample data; sign up to start earning for real.',
  response:
    'Welcome to the SkillXT demo! You earn 1 point for every ₹10 you spend at any partner store, and points can be redeemed for discounts — a 5% platform fee applies on redemption. Everything you see here is sample data; sign up to start earning for real.',
  title: 'SkillXT Demo Assistant',
  matched: true,
  topics: [
    'Earn 1 point per ₹10 spent at partner stores',
    'Redeem points for discounts (5% platform fee)',
    'Demo data resets when you exit or reload'
  ],
  questions: [
    'How do I earn points?',
    'How do I redeem points?',
    'What is 1 point worth?'
  ]
};
