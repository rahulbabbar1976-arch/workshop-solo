import Link from "next/link";
import { Search } from "lucide-react";
import SortFilterBar from "@/components/ui/SortFilterBar";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { formatDate } from "@/lib/dateUtils";

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
  const statusFilter = typeof params.status === 'string' ? params.status : '';
  const sortParam = typeof params.sort === 'string' ? params.sort : 'date_desc';
  const page = typeof params.page === 'string' ? parseInt(params.page) || 1 : 1;
  const limit = 25;

  let orderByClause: any = { createdAt: "desc" };
  if (sortParam === "date_asc") orderByClause = { createdAt: "asc" };
  else if (sortParam === "name_asc") orderByClause = { customer: { displayName: "asc" } };
  else if (sortParam === "name_desc") orderByClause = { customer: { displayName: "desc" } };

  const whereClause: any = {
    tenantId: tenantId || undefined,
  };

  if (statusFilter) {
    if (statusFilter === 'open') {
      whereClause.status = { not: "closed" };
    } else {
      whereClause.status = statusFilter;
    }
  }

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
      orderBy: orderByClause,
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
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        {sortParam && <input type="hidden" name="sort" value={sortParam} />}
        <input type="hidden" name="page" value="1" />
      </form>

      <SortFilterBar 
        filterOptions={[
          { label: "Upcoming (Bookings/Appts)", value: "upcoming" },
          { label: "Open/In Progress", value: "open" },
          { label: "Waiting for Approval", value: "waiting_for_approval" },
          { label: "Ready", value: "ready_for_delivery" },
          { label: "Closed (Delivered)", value: "closed" }
        ]}
      />

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
                  <div className="ticket-meta">
                    opened {formatDate(job.createdAt)} &bull; {(job.status === 'closed' || job.status === 'ready_for_delivery') ? `completed ${formatDate(job.closedAt) || '-'}` : `due ${formatDate(job.expectedDeliveryAt) || '-'}`}
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
            href={`?q=${q}${statusFilter ? `&status=${statusFilter}` : ''}&sort=${sortParam}&page=${Math.max(1, page - 1)}`} 
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
            href={`?q=${q}${statusFilter ? `&status=${statusFilter}` : ''}&sort=${sortParam}&page=${Math.min(totalPages, page + 1)}`} 
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
