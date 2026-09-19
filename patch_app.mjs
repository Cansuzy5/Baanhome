import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace handleExecuteSearch
const handleExecuteSearchStart = code.indexOf('const handleExecuteSearch =');
const handleExecuteSearchEnd = code.indexOf('const handleClearSearch =');

if (handleExecuteSearchStart !== -1 && handleExecuteSearchEnd !== -1) {
  const replacement = `const handleExecuteSearch = async (queryToSearch?: string) => {
    const targetQuery = queryToSearch !== undefined ? queryToSearch : searchQuery;
    if (!targetQuery.trim()) return;
    setSearchQuery(targetQuery);
    setActiveTab('qa');
  };\n\n  `;
  code = code.substring(0, handleExecuteSearchStart) + replacement + code.substring(handleExecuteSearchEnd);
}

// Pass props to CorporateSearchUI
code = code.replace(
  '<CorporateSearchUI',
  '<CorporateSearchUI searchQuery={searchQuery} onSearchChange={setSearchQuery}'
);

fs.writeFileSync('src/App.tsx', code);
