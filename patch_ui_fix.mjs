import fs from 'fs';
let code = fs.readFileSync('src/components/CorporateSearchUI.tsx', 'utf8');

code = code.replace(
  `}
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}`,
  `  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}`
);

fs.writeFileSync('src/components/CorporateSearchUI.tsx', code);
