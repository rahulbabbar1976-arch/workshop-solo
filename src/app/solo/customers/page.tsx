import { prisma } from "@/lib/db";
import { User, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import SortFilterBar from "@/components/ui/SortFilterBar";

export const revalidate = 0;

export default async function CustomersPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const sortParam = typeof params.sort === 'string' ? params.sort : 'date_desc';
  const page = typeof params.page === 'string' ? parseInt(params.page) || 1 : 1;
  const limit = 25;

  let orderByClause: any = { createdAt: 'desc' };
  if (sortParam === "date_asc") orderByClause = { createdAt: "asc" };
  else if (sortParam === "name_asc") orderByClause = { displayName: "asc" };
  else if (sortParam === "name_desc") orderByClause = { displayName: "desc" };

  const whereClause = q ? {
    OR: [
      { displayName: { contains: q } }, // Prisma does not support case-insensitive contains on sqlite easily but since they use Postgres, mode: 'insensitive' works
      { primaryMobile: { contains: q } }
    ]
  } : {};

  // For Postgres we can use mode: 'insensitive'. Let's check if it throws, worst case we rely on precise case. But Postgres supports mode.
  // Actually, wait, let's just use standard contains.
  if (q) {
    (whereClause.OR![0] as any).displayName = { contains: q, mode: 'insensitive' };
  }

  const [totalCount, customers] = await Promise.all([
    prisma.customer.count({ where: whereClause }),
    prisma.customer.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="content">
      <div className="section-title">Clients Directory</div>
      
      <form method="GET" className="searchbar">
        <Search className="w-4 h-4" />
        <input 
          type="search" 
          name="q" 
          defaultValue={q} 
          placeholder="Search by name or phone..." 
        />
        {sortParam && <input type="hidden" name="sort" value={sortParam} />}
        {/* Hidden page input to reset to page 1 on search */}
        <input type="hidden" name="page" value="1" />
      </form>

      <SortFilterBar />

      {customers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--steel)' }}>
          <p>No customers found.</p>
        </div>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {customers.map(c => (
            <div key={c.id} className="customer-row relative group">
              <div className="ci">{c.displayName.charAt(0).toUpperCase()}</div>
              <div className="flex-1">
                <Link href={`/solo/customers/${c.id}`} className="cn block after:absolute after:inset-0 group-hover:text-orange-600 transition-colors">
                  {c.displayName}
                </Link>
                <div className="cm relative z-10 flex gap-3 mt-1 items-center">
                  {c.primaryMobile ? (
                    <>
                      <a href={`tel:${c.primaryMobile}`} className="text-gray-600 font-medium hover:text-orange-500 transition-colors flex items-center gap-1">
                        Call {c.primaryMobile}
                      </a>
                      <a href={`https://wa.me/${c.primaryMobile.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-teal-600 font-medium hover:text-teal-500 transition-colors">
                        WhatsApp
                      </a>
                    </>
                  ) : 'No Mobile'} 
                  <span className="text-gray-300">|</span> 
                  <span className="truncate max-w-[150px] sm:max-w-[300px]">{c.addressLine1 || 'No Address'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="pagination">
          <Link 
            href={`?q=${q}&sort=${sortParam}&page=${Math.max(1, page - 1)}`} 
            className="pagination-btn"
            style={{ pointerEvents: page <= 1 ? 'none' : 'auto', opacity: page <= 1 ? 0.5 : 1, textDecoration: 'none' }}
          >
            Previous
          </Link>
          <div className="pagination-info" style={{ textAlign: 'center' }}>
            Page {page} of {totalPages} <br/>
            <span style={{ fontSize: '10px' }}>({totalCount} records)</span>
          </div>
          <Link 
            href={`?q=${q}&sort=${sortParam}&page=${Math.min(totalPages, page + 1)}`} 
            className="pagination-btn"
            style={{ pointerEvents: page >= totalPages ? 'none' : 'auto', opacity: page >= totalPages ? 0.5 : 1, textDecoration: 'none' }}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
