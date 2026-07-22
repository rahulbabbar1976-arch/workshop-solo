const fs = require('fs');

let code = fs.readFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', 'utf8');

// 1. Add the global style to hide bottomnav
const globalStyle = `
      <style>{\`
        \${(activeTab === 'parts' || activeTab === 'labor' || activeTab === 'pictures') ? '.bottomnav { display: none !important; }' : ''}
      \`}</style>
`;
if (!code.includes(globalStyle.trim())) {
  code = code.replace(
    /<div className="stage">/,
    `<div className="stage">\n${globalStyle}`
  );
}

// 2. Replace parts button with FAB
const oldPartButtonTarget = `            {!isLocked && (
              <button 
                onClick={() => {
                  setEditingPartId(null);
                  setNewPartName("");
                  setNewPartQty(1);
                  setNewPartPrice(0);
                  setNewPartDiscountType("percent");
                  setNewPartDiscountValue(0);
                  setNewPartHsn("");
                  setInventoryPartId("");
                  setSelectedSerialNumberId(null);
                  setAvailableSerialNumbers([]);
                  setIsPartModalOpen(true);
                }}
                className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex items-center justify-center text-sm uppercase tracking-wide">
                Add Part
              </button>
            )}`;

const newPartFAB = `            {!isLocked && (
              <button 
                onClick={() => {
                  setEditingPartId(null);
                  setNewPartName("");
                  setNewPartQty(1);
                  setNewPartPrice(0);
                  setNewPartDiscountType("percent");
                  setNewPartDiscountValue(0);
                  setNewPartHsn("");
                  setInventoryPartId("");
                  setSelectedSerialNumberId(null);
                  setAvailableSerialNumbers([]);
                  setIsPartModalOpen(true);
                }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-orange-600 z-50 transition-transform active:scale-95 border-none"
              >
                <Plus className="w-8 h-8" />
              </button>
            )}`;

// 3. Replace labor button with FAB
const oldLaborButtonTarget = `            {!isLocked && (
              <button 
                onClick={() => {
                  setEditingLaborId(null);
                  setNewLaborName("");
                  setNewLaborQty(1);
                  setNewLaborPrice(0);
                  setNewLaborDiscountType("percent");
                  setNewLaborDiscountValue(0);
                  setNewLaborHsn("");
                  setInventoryLaborId("");
                  setIsLaborModalOpen(true);
                }}
                className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-md text-orange-500 font-bold hover:bg-orange-50 transition-colors flex items-center justify-center text-sm uppercase tracking-wide">
                Add Labor
              </button>
            )}`;

const newLaborFAB = `            {!isLocked && (
              <button 
                onClick={() => {
                  setEditingLaborId(null);
                  setNewLaborName("");
                  setNewLaborQty(1);
                  setNewLaborPrice(0);
                  setNewLaborDiscountType("percent");
                  setNewLaborDiscountValue(0);
                  setNewLaborHsn("");
                  setInventoryLaborId("");
                  setIsLaborModalOpen(true);
                }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-orange-600 z-50 transition-transform active:scale-95 border-none"
              >
                <Plus className="w-8 h-8" />
              </button>
            )}`;

// 4. Add pictures done icon
// We'll just add it to the end of the pictures tab before its closing div.
// The pictures tab ends with {isPhotoModalOpen && (...)} which we shouldn't nest into, so we can append right after the "Upload button" block.
// Wait, I will just do a replacement for the Pictures FAB near the bottomnav style.

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

// Replace blocks
code = code.replace(oldPartButtonTarget, newPartFAB);
code = code.replace(oldLaborButtonTarget, newLaborFAB);

// Add pictures FAB right next to the global style we added
code = code.replace(
  /<div className="stage">/,
  \`<div className="stage">\n\${picturesFAB}\`
);

fs.writeFileSync('src/app/solo/jobcards/[id]/JobCardDetailClient.tsx', code);
console.log('UI Patched!');
