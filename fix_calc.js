const fs = require('fs');

let code = fs.readFileSync('src/app/share/components/PublicShareClient.tsx', 'utf8');

code = code.replace(
  'const totalParts = jobCard.partLines?.reduce((sum: number, p: any) => sum + (p.sellingPrice * p.quantity), 0) || 0;',
  'let totalParts = 0; if(jobCard.partLines){ jobCard.partLines.forEach((p:any) => { totalParts += (Number(p.sellingPrice)||0) * (Number(p.quantityRequested)||Number(p.quantity)||1); }); }'
);

code = code.replace(
  'const totalLabor = jobCard.labourLines?.reduce((sum: number, l: any) => sum + (l.sellingPrice * (l.quantityRequested || l.quantity || 1)), 0) || 0;',
  'let totalLabor = 0; if(jobCard.labourLines){ jobCard.labourLines.forEach((l:any) => { totalLabor += (Number(l.sellingPrice)||0) * (Number(l.quantityRequested)||Number(l.quantity)||1); }); }'
);

code = code.replace(
  '<td className="text-center py-2 text-gray-600">{p.quantity || 1}</td>',
  '<td className="text-center py-2 text-gray-600">{p.quantityRequested || p.quantity || 1}</td>'
);

code = code.replace(
  '<td className="text-right py-2 font-medium text-gray-800">₹{(Number(p.sellingPrice || 0) * Number(p.quantity || 1)).toFixed(2)}</td>',
  '<td className="text-right py-2 font-medium text-gray-800">₹{(Number(p.sellingPrice || 0) * Number(p.quantityRequested || p.quantity || 1)).toFixed(2)}</td>'
);

fs.writeFileSync('src/app/share/components/PublicShareClient.tsx', code);
console.log('Fixed parts/labor calc');
