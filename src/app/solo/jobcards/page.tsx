import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export default async function SoloJobcardsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('workshop_user_id')?.value;
  
  let tenantId: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    tenantId = user?.tenantId || null;
  }

  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const page = typeof params.page === 'string' ? parseInt(params.page) || 1 : 1;
  const limit = 25;

  const whereClause: any = {
    tenantId: tenantId || undefined,
  };

  if (q) {
    whereClause.OR = [
      { jobcardNumber: { contains: q, mode: 'insensitive' } },
      { customer: { displayName: { contains: q, mode: 'insensitive' } } },
      { vehicle: { registrationNumberNormalized: { contains: q.replace(/\s+/g, '').toUpperCase() } } }
    ];
  }

  const [totalCount, rawJobs] = await Promise.all([
    prisma.jobCard.count({ where: whereClause }),
    prisma.jobCard.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        vehicle: true,
      },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const getStatusStampClass = (status: string) => {
    switch(status) {
      case 'IN_PROGRESS': return 'in-progress';
      case 'COMPLETED': return 'completed';
      case 'DELIVERED': return 'ready-pickup';
      default: return 'awaiting-approval';
    }
  };

  return (
    <div className="content">
      <div className="section-title">Job Cards</div>
      
      <form method="GET" className="searchbar">
        <Search className="w-4 h-4" />
        <input 
          type="search" 
          name="q" 
          defaultValue={q} 
          placeholder="Search JC#, Reg No, or Customer..." 
        />
        <input type="hidden" name="page" value="1" />
      </form>

      {rawJobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--steel)' }}>
          <p>No job cards found.</p>
        </div>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {rawJobs.map((job) => (
            <Link key={job.id} href={`/solo/jobcards/${job.id}`} style={{ textDecoration: 'none' }}>
              <div className="ticket">
                <div className="ticket-top">
                  <div>
                    <div className="ticket-id">{job.jobcardNumber}</div>
                    <div className="ticket-plate">
                      {job.vehicle?.registrationNumberNormalized || 'UNKNOWN'}
                    </div>
                    <div className="ticket-veh">
                      {job.vehicle?.manufacturer || ''} {job.vehicle?.model || ''}
                    </div>
                  </div>
                  <div className={`stamp ${getStatusStampClass(job.status)}`}>
                    {job.status.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="ticket-perf">
                  <div className="ticket-cust">{job.customer?.displayName || 'Unknown Customer'}</div>
                  <div className="ticket-meta">{job.createdAt ? job.createdAt.toLocaleDateString() : ''}</div>
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
            style={{ pointerEvents: page <= 1 ? 'none' : 'auto', opacity: page <= 1 ? 0.5 : 1, textDecoration: 'none' }}
          >
            Previous
          </Link>
          <div className="pagination-info" style={{ textAlign: 'center' }}>
            Page {page} of {totalPages} <br/>
            <span style={{ fontSize: '10px' }}>({totalCount} records)</span>
          </div>
          <Link 
            href={`?q=${q}&page=${Math.min(totalPages, page + 1)}`} 
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
