const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../src/app/store/page.tsx');
let content = fs.readFileSync(pagePath, 'utf-8');

// 1. Update part headers in the scan review table to include Match / Vehicle info
content = content.replace(
  /<th style=\{\{ padding: '0\.5rem', width: '95px' \}\}>Rack No\.<\/th>/,
  `<th style={{ padding: '0.5rem' }}>Vehicle Compat</th>\n                        <th style={{ padding: '0.5rem' }}>Action</th>\n                        <th style={{ padding: '0.5rem', width: '95px' }}>Rack No.</th>`
);

// 2. Add full inventory ledger list
if (!content.includes('const [catalogParts')) {
  content = content.replace(
    /const \[selectedInventoryPart, setSelectedInventoryPart\] = useState<any>\(null\);/,
    `const [selectedInventoryPart, setSelectedInventoryPart] = useState<any>(null);\n  const [catalogParts, setCatalogParts] = useState<any[]>([]);`
  );
}

if (!content.includes('fetchCatalogParts')) {
  content = content.replace(
    /const fetchPlannerData = async/,
    `const fetchCatalogParts = async () => {\n    try {\n      const res = await fetch('/api/parts?all=true');\n      const data = await res.json();\n      if (data.success) setCatalogParts(data.parts || []);\n    } catch (e) { console.error(e); }\n  };\n\n  const fetchPlannerData = async`
  );
}

// 3. Mount effect
content = content.replace(
  /fetchPlannerData\(\);/,
  `fetchPlannerData();\n      fetchCatalogParts();`
);

fs.writeFileSync(pagePath, content);
console.log('Updated store/page.tsx headers and added catalog fetching.');
