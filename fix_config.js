const fs = require('fs');

let code = fs.readFileSync('src/app/share/components/PublicShareClient.tsx', 'utf8');

const oldTarget = `  const config = printSettings?.layoutConfig ? JSON.parse(printSettings.layoutConfig) : [];
  const isEnabled = (id: string) => {
    const item = config.find((c: any) => c.id === id);`;

const newCode = `  let config: any[] = [];
  try {
    const parsed = printSettings?.layoutConfig ? JSON.parse(printSettings.layoutConfig) : [];
    config = Array.isArray(parsed) ? parsed : [];
  } catch(e) {}
  
  const isEnabled = (id: string) => {
    if (!Array.isArray(config)) return true;
    const item = config.find((c: any) => c.id === id);`;

code = code.replace(oldTarget, newCode);

fs.writeFileSync('src/app/share/components/PublicShareClient.tsx', code);
console.log('Fixed config check');
