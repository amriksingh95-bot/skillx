const fs = require('fs');

const inputFile = 'knowledge-base-normalized.md';
const outputFile = 'backend/knowledge-base.json';

const content = fs.readFileSync(inputFile, 'utf8');
const articles = [];

// Find all article positions
const lines = content.split('\n');
const articlePositions = [];

lines.forEach((line, idx) => {
    const m = line.match(/^# Article (\d+):/);
    if (m) {
        articlePositions.push({ id: parseInt(m[1]), start: idx });
    }
});

// Extract each article
articlePositions.forEach((pos, idx) => {
    const endIdx = idx < articlePositions.length - 1 ? articlePositions[idx + 1].start : lines.length;
    const articleLines = lines.slice(pos.start, endIdx);
    const articleContent = articleLines.join('\n');

    const titleMatch = articleContent.match(/## Article Title\n([^\n]+)/);
    const targetUserMatch = articleContent.match(/## Target User\n([^\n]+)/);
    const purposeMatch = articleContent.match(/## Purpose\n([^\n]+)/);

    const title = titleMatch ? titleMatch[1].trim() : '';
    const targetUser = targetUserMatch ? targetUserMatch[1].trim() : '';
    const purpose = purposeMatch ? purposeMatch[1].trim() : '';

    const keyTopics = [];
    const topicsSection = articleContent.match(/## Key Topics\n([\s\S]*?)(?=\n## Example Questions|\n## Related Articles)/);
    if (topicsSection) {
        const numberedTopics = topicsSection[1].match(/^### \d+\. .*/gm);
        if (numberedTopics) {
            numberedTopics.forEach(t => {
                const topic = t.replace(/^### \d+\. /, '').trim();
                keyTopics.push(topic);
            });
        }
        if (keyTopics.length === 0) {
            const bulletTopics = topicsSection[1].match(/^- .*/gm);
            if (bulletTopics) {
                bulletTopics.forEach(t => {
                    const topic = t.replace(/^- /, '').trim();
                    keyTopics.push(topic);
                });
            }
        }
    }

    const exampleQuestions = [];
    const questionsSection = articleContent.match(/## Example Questions\n([\s\S]*?)(?=\n## Related Articles)/);
    if (questionsSection) {
        const questions = questionsSection[1].match(/^\d+\.\s.+/gm);
        if (questions) {
            questions.forEach(q => {
                const question = q.replace(/^\d+\.\s/, '').trim();
                exampleQuestions.push(question);
            });
        }
    }

    articles.push({
        id: pos.id,
        title,
        targetUser,
        purpose,
        keyTopics,
        exampleQuestions
    });
});

fs.writeFileSync(outputFile, JSON.stringify(articles, null, 2));
console.log(`Parsed ${articles.length} articles to ${outputFile}`);

// Verify
const parsed = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
console.log('Sample article (1): topics:', parsed[0]?.keyTopics.length, 'questions:', parsed[0]?.exampleQuestions.length);
console.log('Sample article (57): topics:', parsed.find(a => a.id === 57)?.keyTopics.length, 'questions:', parsed.find(a => a.id === 57)?.exampleQuestions.length);