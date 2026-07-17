import { getGeminiKey } from './gemini';
import prisma from './db';

interface HsnPrediction {
  hsnCode: string;
  gstRate: number;
}

export async function predictAndSaveHsn(
  itemName: string,
  isLabour: boolean,
  masterId?: string | null
): Promise<HsnPrediction> {
  const defaultHsn = isLabour ? '9987' : '8708';
  const defaultGst = 18;

  try {
    const apiKey = await getGeminiKey();
    if (!apiKey) {
      console.warn('Gemini API key not configured for HSN prediction. Using defaults.');
      return { hsnCode: defaultHsn, gstRate: defaultGst };
    }

    const prompt = `You are an expert Indian GST tax assistant for automotive workshops.
Find the most accurate 4-digit or 6-digit HSN (Harmonized System Nomenclature) code for goods, or SAC (Services Accounting Code) for labor, and the standard GST percentage rate in India for the following automotive workshop item:
Name: "${itemName}"
Type: ${isLabour ? 'Labor / Service charge' : 'Spare Part / Material'}

Respond strictly in JSON format matching this schema:
{
  "hsnCode": "string (digits only)",
  "gstRate": number (standard Indian GST rate, typically 18 or 28 for automobile parts/labor)
}
Do not write any other explanation or markdown. Just the JSON object.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
      }
    );

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (textResponse) {
      const parsed: HsnPrediction = JSON.parse(textResponse.trim());
      const hsnCode = parsed.hsnCode?.replace(/\D/g, '') || defaultHsn;
      const gstRate = typeof parsed.gstRate === 'number' ? parsed.gstRate : defaultGst;

      // Save HSN code to Master list for future pre-population
      if (masterId) {
        try {
          if (isLabour) {
            await prisma.labourMaster.update({
              where: { id: masterId },
              data: { hsnCode: hsnCode, defaultTaxRate: gstRate }
            });
          } else {
            await prisma.partsMaster.update({
              where: { id: masterId },
              data: { hsnCode: hsnCode, defaultTaxRate: gstRate }
            });
          }
          console.log(`Successfully updated master record ${masterId} with AI-predicted HSN ${hsnCode}`);
        } catch (dbErr) {
          console.error('Failed to update HSN code in Master database:', dbErr);
        }
      }

      return { hsnCode, gstRate };
    }
  } catch (err) {
    console.error('Gemini HSN prediction failed:', err);
  }

  return { hsnCode: defaultHsn, gstRate: defaultGst };
}
