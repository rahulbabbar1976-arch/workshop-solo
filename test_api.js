const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const jobcard = await prisma.jobCard.findFirst();
    if (!jobcard) return console.log('No jobcard found');
    console.log("Found JobCard:", jobcard.id);

    // Test with status
    let res = await fetch('http://localhost:3000/api/jobcards/' + jobcard.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    console.log("Status update response:", res.status, await res.text());

    // Test with payment
    res = await fetch('http://localhost:3000/api/jobcards/' + jobcard.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountPaid: 100 })
    });
    console.log("Payment update response:", res.status, await res.text());

  } catch(e) { console.error(e) } finally {
    await prisma.$disconnect();
  }
})();
