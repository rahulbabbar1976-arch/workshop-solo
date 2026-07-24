import { analyzeWithGemini } from './gemini-analyzer';

export async function predictLabourHours(vehicleMake: string, vehicleModel: string, complaint: string) {
  const prompt = `
    Based on the following vehicle and complaint, estimate the labor hours required to fix the issue.
    Vehicle: ${vehicleMake} ${vehicleModel}
    Complaint: ${complaint}
    
    Respond strictly in JSON format with an object containing:
    - estimatedHours (number)
    - complexity (enum: "EASY", "MEDIUM", "HARD", "VERY_HARD")
    - reasoning (string)
  `;

  const fallback = {
    estimatedHours: 2,
    complexity: "MEDIUM",
    reasoning: "Standard diagnostic and repair time."
  };

  const result = await analyzeWithGemini(prompt);
  
  if (result && typeof result.estimatedHours === 'number') {
    return result;
  }
  
  return fallback;
}
