const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8');

// 1. Add the global style to hide bottomnav
const globalStyle = `
      <style>{\`
        \${(activeTab === 'parts' || activeTab === 'labor' || activeTab === 'pictures') ? '.bottomnav { display: none !important; }' : ''}
      \`}</style>
`;
if (!code.includes('.bottomnav { display: none !important; }')) {
  code = code.replace(
    /<div className="stage">/,
    `<div className="stage">\n${globalStyle}`
  );
}

// 2. Replace parts button with FAB
code = code.replace(
  /className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex items-center justify-center text-sm uppercase tracking-wide">\s*Add Part\s*<\/button>/g,
  `className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-orange-600 z-50 transition-transform active:scale-95 border-none">\n                <Plus className="w-8 h-8" />\n              </button>`
);

// 3. Replace labor button with FAB
code = code.replace(
  /className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex items-center justify-center text-sm uppercase tracking-wide">\s*Add Labor\s*<\/button>/g,
  `className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-orange-600 z-50 transition-transform active:scale-95 border-none">\n                <Plus className="w-8 h-8" />\n              </button>`
);

// 4. Add pictures done icon
const picturesFAB = `
      {activeTab === "pictures" && (
        <button 
          onClick={() => setActiveTab("details")}
          className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-emerald-600 z-50 transition-transform active:scale-95 border-none"
        >
          <CheckCircle className="w-8 h-8" />
        </button>
      )}
`;
if (!code.includes('onClick={() => setActiveTab("details")}')) {
  code = code.replace(
    /<div className="stage">/,
    `<div className="stage">\n${picturesFAB}`
  );
}

fs.writeFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', code);
console.log('UI Patched successfully!');
