import prisma from '../../lib/db';

async function testOpenRouter() {
  const profile = await prisma.workshopProfile.findFirst({
    select: { openRouterApiKey: true }
  });
  const apiKey = profile?.openRouterApiKey;
  if (!apiKey) {
    console.error('No OpenRouter API key found in DB');
    return;
  }

  console.log('Testing OpenRouter key (first 10 chars):', apiKey.substring(0, 10));

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: 'Say hello' }]
      })
    });

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (e: any) {
    console.error('Error contacting OpenRouter:', e.message);
  }
}

testOpenRouter().catch(console.error).finally(() => prisma.$disconnect());
