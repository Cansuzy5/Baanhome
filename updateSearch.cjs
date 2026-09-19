const fs = require('fs');
let content = fs.readFileSync('src/utils/searchEngine.ts', 'utf8');

const targetStr = `    // F. Direct keyword match with clean query
    for (const kw of item.keywords) {
      const kwLower = kw.toLowerCase();
      if (clean.includes(kwLower) || kwLower.includes(clean)) {
        score += 30;
        if (!matched.includes(kw)) matched.push(kw);
      }
    }`;

const newStr = `    // F. Direct keyword match with clean query & Fuzzy Fallback
    const queryWords = clean.split(/\\s+/).filter(w => w.length > 0);
    
    for (const kw of item.keywords) {
      const kwLower = kw.toLowerCase();
      
      // Exact substring match
      if (clean.includes(kwLower) || kwLower.includes(clean)) {
        score += 30;
        if (!matched.includes(kw)) matched.push(kw);
      } else {
        // Fuzzy Match (handles typos)
        for (const qw of queryWords) {
          if (qw.length > 2 && kwLower.length > 2) {
            const sim = calculateFuzzySimilarity(qw, kwLower);
            if (sim >= 0.7) { // 70% similarity threshold
              score += 20 * sim; // Add up to 20 points
              const matchText = \`เดาคำใกล้เคียง: \${kw}\`;
              if (!matched.includes(matchText)) matched.push(matchText);
            }
          }
        }
      }
    }`;

content = content.replace(targetStr, newStr);
fs.writeFileSync('src/utils/searchEngine.ts', content);
