import { Client } from 'pg';

async function testOpenRouter() {
  const directUrl = "postgresql://postgres.hhxedpejjumnnjmvzkbv:G3singh%401704@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
  const client = new Client({ connectionString: directUrl });

  await client.connect();
  console.log('Connected to DB');

  const resDb = await client.query('SELECT "openRouterApiKey" FROM "WorkshopProfile" LIMIT 1');
  const apiKey = resDb.rows[0]?.openRouterApiKey;
  await client.end();

  if (!apiKey) {
    console.error('No OpenRouter API key found in DB');
    return;
  }

  console.log('Testing OpenRouter key:', apiKey.substring(0, 10) + '...');

  // Small 1x1 black pixel GIF image in base64
  const dummyBase64 = 'R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
  const model = 'openrouter/free';

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

    console.log(`Status:`, res.status);
    const text = await res.text();
    console.log(`Response:`, text);
  } catch (e: any) {
    console.error(`Error:`, e.message);
  }
}

testOpenRouter().catch(console.error);
