const knowledgeBase = require('../../knowledge-base.json');
const faqResponses = require('../data/chatbot-responses.json').responses;
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const STOPWORDS = ['what', 'how', 'do', 'i', 'is', 'the', 'a', 'an', 'my', 'can', 'why', 'where', 'when', 'are', 'does', 'tell', 'me', 'about', 'give', 'should', 'join', 'please', 'want', 'know', 'get', 'its', 'it', 'this', 'that', 'with', 'for', 'on', 'at', 'to', 'from', 'by', 'in', 'of', 'and', 'or', 'not', 'up'];

async function findBestMatch(question) {
    if (!question || typeof question !== 'string') {
        return null;
    }

    const lowerQuestion = question.toLowerCase().trim();

    // STEP 1: Primary - Match against chatbot-responses.json
    for (const entry of faqResponses) {
        if (entry.keywords && entry.keywords.some(keyword => lowerQuestion.includes(keyword.toLowerCase()))) {
            return {
                title: 'SkillXT Assistant',
                answer: entry.answer,
                matched: true,
                source: 'faq'
            };
        }
    }

    // STEP 2: Secondary - Gemini with minimal context
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    const keywords = lowerQuestion
        .split(/\s+/)
        .map(k => k.replace(/[.,?!]/g, ''))
        .filter(k => k.length > 0 && !STOPWORDS.includes(k));

    // Pre-filter: find TOP 3 articles with any keyword match
    let candidateArticles = [];
    for (const article of knowledgeBase) {
        const combinedText = [
            article.title,
            ...article.keyTopics
        ].join(' ').toLowerCase();

        if (keywords.some(k => combinedText.includes(k))) {
            candidateArticles.push(article);
        }
    }

    // Take top 3 only
    const topArticles = candidateArticles.slice(0, 3);

    if (topArticles.length === 0) {
        return null;
    }

    // Build minimal context - title and keyTopics only
    const articlesContext = topArticles.map(a => 
        `Title: ${a.title}. Topics: ${a.keyTopics.join(', ')}`
    ).join('\n');

    const prompt = `You are SkillXT loyalty platform assistant. Answer in 2-3 sentences only. Context: ${articlesContext}. Question: ${question}`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const answer = result.response.text();

        return {
            title: 'SkillXT Assistant',
            answer,
            matched: true,
            source: 'ai'
        };
    } catch (error) {
        console.error('Gemini API error:', error);
        return null;
    }
}

module.exports = {
    findBestMatch
};