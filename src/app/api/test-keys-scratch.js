const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.workshopProfile.findFirst({
    select: {
      geminiApiKey: true,
      openRouterApiKey: true
    }
  });
  console.log('Workshop Profile Keys:', {
    geminiApiKeyExists: !!profile?.geminiApiKey,
    geminiApiKeyLength: profile?.geminiApiKey?.length,
    openRouterApiKeyExists: !!profile?.openRouterApiKey,
    openRouterApiKeyLength: profile?.openRouterApiKey?.length
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
