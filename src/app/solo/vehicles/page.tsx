import { prisma } from "@/lib/db";
import { Car, Search } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function VehiclesPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const page = typeof params.page === 'string' ? parseInt(params.page) || 1 : 1;
  const limit = 25;

  const whereClause = q ? {
    OR: [
      { registrationNumberNormalized: { contains: q.replace(/\s+/g, '').toUpperCase() } },
      { manufacturer: { contains: q, mode: 'insensitive' as any } },
      { model: { contains: q, mode: 'insensitive' as any } }
    ]
  } : {};

  // For sqlite fallback if mode: insensitive throws, we can just rely on standard contains.
  // Actually, since this project uses PostgreSQL (pg adapter in package.json), mode: 'insensitive' is fully supported!

  const [totalCount, vehicles] = await Promise.all([
    prisma.vehicle.count({ where: whereClause }),
    prisma.vehicle.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { currentCustomer: true },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="content">
      <div className="section-title flex items-center justify-between">
        <span>Vehicles Directory</span>
        <Link href="/solo/vehicles/service-due" className="text-sm bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg font-bold flex items-center hover:bg-orange-200 transition-colors">
          Service Due
        </Link>
      </div>
      
      <form method="GET" className="searchbar">
        <Search className="w-4 h-4" />
        <input 
          type="search" 
          name="q" 
          defaultValue={q} 
          placeholder="Search by plate, make, or model..." 
        />
        <input type="hidden" name="page" value="1" />
      </form>

      {vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--steel)' }}>
          <p>No vehicles found.</p>
        </div>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {vehicles.map(v => (
            <Link key={v.id} href={`/solo/vehicles/${v.id}`} className="block">
              <div className="vehicle-card hover:border-orange-400 hover:shadow-md transition-all cursor-pointer">
                <div className="vicon">
                  <Car className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
                </div>
                <div>
                  <div className="vp">{v.registrationNumberNormalized || v.registrationNumberRaw}</div>
                  <div className="vm">
                    {v.manufacturer || "Unknown Make"} {v.model || ""} 
                    {v.currentCustomer?.displayName && ` • Owner: ${v.currentCustomer.displayName}`}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="pagination">
          <Link 
            href={`?q=${q}&page=${Math.max(1, page - 1)}`} 
            className="pagination-btn"
            style={{ pointerEvents: page <= 1 ? 'none' : 'auto', opacity: page <= 1 ? 0.5 : 1 }}
          >
            Previous
          </Link>
          <div className="pagination-info">
            Page {page} of {totalPages} <br/>
            <span style={{ fontSize: '10px' }}>({totalCount} records)</span>
          </div>
          <Link 
            href={`?q=${q}&page=${Math.min(totalPages, page + 1)}`} 
            className="pagination-btn"
            style={{ pointerEvents: page >= totalPages ? 'none' : 'auto', opacity: page >= totalPages ? 0.5 : 1 }}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
