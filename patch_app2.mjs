import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

const start = code.indexOf('const handleExecuteSearch =');
const end = code.indexOf('const handleFeedback =');

if (start !== -1 && end !== -1) {
  const replacement = `const handleExecuteSearch = async (queryToSearch?: string) => {
    const targetQuery = queryToSearch !== undefined ? queryToSearch : searchQuery;
    if (!targetQuery.trim()) return;
    setSearchQuery(targetQuery);
    setActiveTab('qa');
  };\n\n  `;
  code = code.substring(0, start) + replacement + code.substring(end);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Patched');
} else {
  console.log('Not found');
}
