import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' }); // Using a default capable model

export async function analyzeWithGemini(prompt: string, systemInstruction?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. Returning fallback data.");
      return null;
    }

    // Prepare contents
    const contents: any[] = [];
    if (systemInstruction) {
        contents.push({ role: 'user', parts: [{ text: `SYSTEM INSTRUCTION: ${systemInstruction}` }] });
        contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
    }
    
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const result = await model.generateContent({ contents });
    const text = result.response.text();
    
    // Try to parse as JSON if it looks like JSON
    if (text.includes('{') && text.includes('}')) {
      try {
        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        return JSON.parse(jsonStr);
      } catch (e) {
        return text;
      }
    }
    
    return text;
  } catch (error) {
    console.error('Gemini Analysis Error:', error);
    return null;
  }
}
