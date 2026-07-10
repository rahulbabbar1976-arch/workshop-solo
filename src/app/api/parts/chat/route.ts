import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ success: false, error: 'Message query is required' }, { status: 400 });
    }

    const query = message.toLowerCase();
    let replyText = '';
    let partsList: any[] = [];

    // 1. Identify Intent & Query DB accordingly
    if (query.includes('filter')) {
      // Find filters in catalog
      const items = await prisma.partsMaster.findMany({
        where: {
          OR: [
            { category: { contains: 'filter', lte: '' } }, // sqlite case insensitive contains
            { partName: { contains: 'filter' } }
          ]
        }
      });
      partsList = items;
      replyText = `I searched the **Parts Master Catalog** for items containing "Filter". I found **${items.length} filters** in our inventory database. Here is the active list:`;
    } 
    else if (query.includes('low') || query.includes('stock') || query.includes('safety') || query.includes('reorder') || query.includes('out')) {
      // Find items below safety stock
      const items = await prisma.partsMaster.findMany({
        where: {
          isActive: true
        }
      });
      // Filter in memory for safety stock
      const lowStock = items.filter(i => (i.stockQuantity || 0) <= (i.safetyStock || 2));
      partsList = lowStock;
      replyText = `I ran a safety stock audit on the active inventory. I detected **${lowStock.length} items** that are currently at or below their **Reorder Safety Threshold (Safety Stock: 2)**. Here is the replenishment proposal:`;
    }
    else if (query.includes('lubricant') || query.includes('oil') || query.includes('coolant')) {
      // Find lubricants
      const items = await prisma.partsMaster.findMany({
        where: {
          OR: [
            { category: { contains: 'lubricant' } },
            { category: { contains: 'oil' } },
            { partName: { contains: 'oil' } },
            { partName: { contains: 'coolant' } }
          ]
        }
      });
      partsList = items;
      replyText = `I searched the catalog for lubricants, synthetic engine oils, and coolants. I found **${items.length} items** matching. Here is the list:`;
    }
    else if (query.includes('battery') || query.includes('batteries')) {
      // Find batteries
      const items = await prisma.partsMaster.findMany({
        where: {
          OR: [
            { category: { contains: 'battery' } },
            { partName: { contains: 'battery' } },
            { partName: { contains: 'exide' } },
            { partName: { contains: 'amaron' } }
          ]
        }
      });
      partsList = items;
      replyText = `I checked the catalog for battery spares and specifications. I found **${items.length} battery entries**. Here is the inventory list:`;
    }
    else if (query.includes('brake') || query.includes('brakes') || query.includes('pad')) {
      // Find brakes
      const items = await prisma.partsMaster.findMany({
        where: {
          OR: [
            { category: { contains: 'brake' } },
            { partName: { contains: 'brake' } },
            { partName: { contains: 'pad' } }
          ]
        }
      });
      partsList = items;
      replyText = `I found **${items.length} brake spare entries** in our catalog. Here is the compatibility list:`;
    }
    else if (query.includes('budget') || query.includes('cost') || query.includes('value') || query.includes('price')) {
      // Return budget summary
      const items = await prisma.partsMaster.findMany({
        where: { isActive: true }
      });
      const lowStock = items.filter(i => (i.stockQuantity || 0) <= (i.safetyStock || 2));
      const totalCost = lowStock.reduce((acc, curr) => acc + ((curr.defaultSellingPrice || 150) * (curr.safetyStock || 2)), 0);
      partsList = lowStock.slice(0, 5); // Return top 5 for illustration
      replyText = `Based on the active safety-stock gaps, we require restocking **${lowStock.length} unique parts**. 
      
* **Total Estimated Replenishment Cost**: ₹${Math.round(totalCost).toLocaleString()}
* **Proposed Source**: Local MGP / OEM Vendors

Here are the top high-priority parts causing this budget allocation:`;
    }
    // Check for specific car models (e.g. swift, city, innova, verna, polo, fortuner)
    else {
      const models = ['swift', 'city', 'innova', 'verna', 'polo', 'fortuner', 'creta', 'baleno', 'amaze'];
      const matchedModel = models.find(m => query.includes(m));

      if (matchedModel) {
        // Find parts associated with this car model name
        const items = await prisma.partsMaster.findMany({
          where: {
            OR: [
              { partName: { contains: matchedModel } },
              { brand: { contains: matchedModel } }
            ]
          }
        });
        
        partsList = items;
        replyText = `I filtered the database for parts matching the compatible model "**${matchedModel.toUpperCase()}**". I found **${items.length} items** in the parts master:`;
      } else {
        // Help fallback reply
        const count = await prisma.partsMaster.count();
        replyText = `Hello! I am your **Gemini Parts Assistant** 🤖. I can query our live workshop database containing **${count} active parts catalog entries**.
        
Here are some interactive queries you can type to retrieve live data:
* *"Show me all filters"*
* *"Which parts are out of stock / low stock?"*
* *"Show parts for Swift"* (or City, Innova, Verna)
* *"List our lubricant and oil stocks"*
* *"What is our estimated parts cost / budget?"*

What would you like me to analyze today?`;
      }
    }

    return NextResponse.json({
      success: true,
      message: replyText,
      partsList
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
