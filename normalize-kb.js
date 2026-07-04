const fs = require('fs');

const inputFile = 'knowledge-base-full.md';
const outputFile = 'knowledge-base-normalized.md';

const content = fs.readFileSync(inputFile, 'utf8');
const articleHeaderRegex = /# Article (\d+):/g;
let match;
const articleNumbers = [];
while ((match = articleHeaderRegex.exec(content)) !== null) {
    articleNumbers.push(parseInt(match[1]));
}

const articles = content.split(/# Article \d+:/);

let modifiedCount = 0;
const normalizedArticles = [];

for (let i = 1; i < articles.length; i++) {
    let article = articles[i];
    let wasModified = false;
    const articleNum = articleNumbers[i - 1];
    
    // Truncate Key Topics to max 8 items
    const keyTopicsIdx = article.indexOf('## Key Topics');
    const exampleQuestionsIdx = article.indexOf('## Example Questions');
    const relatedArticlesIdx = article.indexOf('## Related Articles');
    
    // Find end of Key Topics section (before Example Questions or Related Articles)
    const keyTopicsEndIdx = exampleQuestionsIdx !== -1 ? exampleQuestionsIdx : relatedArticlesIdx;
    
    if (keyTopicsIdx !== -1 && keyTopicsEndIdx !== -1) {
        const keyTopicsContent = article.substring(keyTopicsIdx + '## Key Topics'.length, keyTopicsEndIdx);
        const topicHeaders = keyTopicsContent.split('\n').filter(line => line.trim().startsWith('### '));
        
        if (topicHeaders.length > 8) {
            wasModified = true;
            const allLines = article.split('\n');
            let topicsSeen = 0;
            let cutoffLine = allLines.length;
            
            for (let j = 0; j < allLines.length; j++) {
                if (allLines[j].trim().startsWith('### ')) {
                    topicsSeen++;
                    if (topicsSeen > 8) {
                        cutoffLine = j;
                        break;
                    }
                }
            }
            // Keep content before cutoff + content after Key Topics section
            article = allLines.slice(0, cutoffLine).join('\n') + '\n' + article.substring(keyTopicsEndIdx);
        }
    }
    
    // Re-find indices after Key Topics truncation
    const newExampleQuestionsIdx = article.indexOf('## Example Questions');
    const newRelatedArticlesIdx = article.indexOf('## Related Articles');
    
    // Truncate Example Questions to max 10 items
    if (newExampleQuestionsIdx !== -1 && newRelatedArticlesIdx !== -1) {
        const questionsContent = article.substring(newExampleQuestionsIdx + '## Example Questions'.length, newRelatedArticlesIdx);
        const questionLines = questionsContent.split('\n').filter(line => /^\d+\.\s/.test(line.trim()));
        
        if (questionLines.length > 10) {
            wasModified = true;
            const allLines = article.split('\n');
            let questionsSeen = 0;
            let cutoffLine = allLines.length;
            
            for (let j = 0; j < allLines.length; j++) {
                if (/^\d+\.\s/.test(allLines[j].trim())) {
                    questionsSeen++;
                    if (questionsSeen > 10) {
                        cutoffLine = j;
                        break;
                    }
                }
            }
            
            article = allLines.slice(0, cutoffLine).join('\n') + '\n' + article.substring(newRelatedArticlesIdx);
        }
    }
    
    if (wasModified) modifiedCount++;
    normalizedArticles.push('# Article ' + articleNum + ':' + article);
}

fs.writeFileSync(outputFile, normalizedArticles.join('\n'));
console.log('Normalized ' + modifiedCount + ' articles');