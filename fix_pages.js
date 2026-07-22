const fs = require('fs');

function fixPage(file) {
    let code = fs.readFileSync(file, 'utf8');
    // Using regex to replace the old sync params with async params
    code = code.replace(
        /export default function (\w+)\({ params }: { params: { id: string } }\) {([\s\S]*?)return <PublicShareClient id={params\.id} ([\s\S]*?)};?/,
        'export default async function $1({ params }: { params: Promise<{ id: string }> }) {\n  const resolvedParams = await params;\n  return <PublicShareClient id={resolvedParams.id} $3;'
    );
    fs.writeFileSync(file, code);
}

fixPage('src/app/share/jobcard/[id]/page.tsx');
fixPage('src/app/share/estimate/[id]/page.tsx');
console.log("Pages fixed.");
