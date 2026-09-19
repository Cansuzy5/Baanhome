const fs = require('fs');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

// Replace imports
appTsx = appTsx.replace(
  "import { SearchHero } from './components/SearchHero';",
  "import { CorporateSearchUI } from './components/CorporateSearchUI';"
);

// We need to inject CorporateSearchUI logic into App.tsx
// Let's replace the whole `activeTab === 'qa'` section with <CorporateSearchUI />

const qaTabStart = appTsx.indexOf("{activeTab === 'qa' && (");
const b2bTabStart = appTsx.indexOf("{/* Tab: B2B */}");

if (qaTabStart !== -1 && b2bTabStart !== -1) {
  const replacement = `{activeTab === 'qa' && (
          <CorporateSearchUI
            activeKnowledgeItems={activeKnowledgeItems}
            staffName={currentStaff.name}
            onRecordLog={(query, result) => {
              if (query && result) {
                const newLog = {
                  id: \`log-\${Date.now()}\`,
                  timestamp: new Date().toISOString(),
                  staffName: currentStaff.name,
                  department: currentStaff.department,
                  question: query,
                  answerSummary: result.item.summary,
                  category: result.item.category,
                  sourceDoc: result.item.sourceDoc,
                  found: true,
                };
                createQuestionLog(newLog);
              }
            }}
            onAskUnanswered={(query) => {
              const u = {
                id: \`un-\${Date.now()}\`,
                timestamp: new Date().toISOString(),
                staffName: currentStaff.name,
                department: currentStaff.department,
                question: query,
                status: 'pending' as const,
              };
              createUnansweredQuestion(u);
              setActiveTab('unanswered');
            }}
          />
        )}
        `;
  
  appTsx = appTsx.substring(0, qaTabStart) + replacement + appTsx.substring(b2bTabStart);
  fs.writeFileSync('src/App.tsx', appTsx);
  console.log("App.tsx modified");
} else {
  console.log("Could not find QA tab start or B2B tab start.");
}

