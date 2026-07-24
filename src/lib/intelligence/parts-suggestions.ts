import { analyzeWithGemini } from './gemini-analyzer';

export async function suggestParts(vehicleMake: string, vehicleModel: string, complaint: string) {
  const prompt = `
    Based on the following vehicle and complaint, suggest the most likely replacement parts needed.
    Vehicle: ${vehicleMake} ${vehicleModel}
    Complaint: ${complaint}
    
    Respond strictly in JSON format with an array of "parts", each containing:
    - partDescription (string)
    - estimatedPrice (number)
    - priority (enum: "HIGH", "MEDIUM", "LOW")
  `;

  const fallback = [
    { partDescription: "Diagnosis Tool Charge", estimatedPrice: 500, priority: "HIGH" },
    { partDescription: "General Consumables", estimatedPrice: 200, priority: "LOW" }
  ];

  const result = await analyzeWithGemini(prompt);
  
  if (result && Array.isArray(result.parts)) {
    return result.parts;
  }
  
  return fallback;
}
