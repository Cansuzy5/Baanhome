const fs = require('fs');
const content = fs.readFileSync('src/utils/searchEngine.ts', 'utf8');

const helperCode = `
/**
 * Calculates similarity between two strings using Levenshtein distance (0.0 to 1.0)
 */
function calculateFuzzySimilarity(a: string, b: string): number {
  if (!a || !b) return 0.0;
  if (a === b) return 1.0;
  
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }
  const distance = matrix[b.length][a.length];
  const maxLength = Math.max(a.length, b.length);
  return (maxLength - distance) / maxLength;
}
`;

const updatedContent = content.replace('export function searchKnowledgeBaseAdvanced(', helperCode + '\nexport function searchKnowledgeBaseAdvanced(');
fs.writeFileSync('src/utils/searchEngine.ts', updatedContent);
