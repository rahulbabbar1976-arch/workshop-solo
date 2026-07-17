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

  // Small 1x1 black pixel GIF image in base64
  const dummyBase64 = 'R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';

  const models = [
    'openrouter/free',
    'google/gemini-2.5-flash:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free'
  ];

  for (const model of models) {
    console.log(`Testing model: ${model}`);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'What color is this image?' },
                { type: 'image_url', image_url: { url: `data:image/gif;base64,${dummyBase64}` } }
              ]
            }
          ]
        })
      });

      console.log(`Status for ${model}:`, res.status);
      const text = await res.text();
      console.log(`Response for ${model}:`, text.substring(0, 300));
    } catch (e: any) {
      console.error(`Error with ${model}:`, e.message);
    }
  }
}

testOpenRouter().catch(console.error).finally(() => prisma.$disconnect());
