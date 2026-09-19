import fs from 'fs';
let code = fs.readFileSync('src/components/CorporateSearchUI.tsx', 'utf8');

code = code.replace(
  'export const CorporateSearchUI: React.FC<CorporateSearchUIProps> = ({',
  `  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const CorporateSearchUI: React.FC<CorporateSearchUIProps> = ({
  searchQuery,
  onSearchChange,`
);

code = code.replace(
  "const [query, setQuery] = useState('');",
  "const query = searchQuery || '';\n  const setQuery = onSearchChange || (() => {});"
);

fs.writeFileSync('src/components/CorporateSearchUI.tsx', code);
