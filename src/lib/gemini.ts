import prisma from './db';

/**
 * Loads the Gemini API key from the workshop profile in the database.
 * Falls back to the GEMINI_API_KEY environment variable if not configured.
 */
export async function getGeminiKey(): Promise<string> {
  try {
    const profile = await prisma.workshopProfile.findFirst({
      select: { geminiApiKey: true },
    });
    const keyString = profile?.geminiApiKey?.trim();
    if (keyString) {
      const keys = keyString.split(',').map(k => k.trim()).filter(k => k.length > 0);
      if (keys.length > 0) {
        return keys[Math.floor(Math.random() * keys.length)];
      }
    }
  } catch (e) {
    // DB not available — fall through to env
  }
  
  const envKey = process.env.GEMINI_API_KEY || '';
  const envKeys = envKey.split(',').map(k => k.trim()).filter(k => k.length > 0);
  if (envKeys.length > 0) {
    return envKeys[Math.floor(Math.random() * envKeys.length)];
  }
  return '';
}
