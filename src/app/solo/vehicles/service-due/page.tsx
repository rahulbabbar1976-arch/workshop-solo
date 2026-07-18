import { prisma } from "@/lib/db";
import { Car, Search, MessageCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import WhatsAppButton from "@/components/WhatsAppButton";

export const revalidate = 0;

export default async function ServiceDuePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const page = typeof params.page === 'string' ? parseInt(params.page) || 1 : 1;
  const limit = 25;

  const profile = await prisma.workshopProfile.findFirst();

  // Due is anything from the past, or up to 30 days in the future
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const whereClause: any = {
    nextServiceDate: {
      lte: thirtyDaysFromNow
    }
  };

  if (q) {
    whereClause.OR = [
      { registrationNumberNormalized: { contains: q.replace(/\s+/g, '').toUpperCase() } },
      { manufacturer: { contains: q, mode: 'insensitive' as any } },
      { model: { contains: q, mode: 'insensitive' as any } },
      { currentCustomer: { name: { contains: q, mode: 'insensitive' as any } } }
    ];
  }

  const [totalCount, vehicles] = await Promise.all([
    prisma.vehicle.count({ where: whereClause }),
    prisma.vehicle.findMany({
      where: whereClause,
      orderBy: { nextServiceDate: 'asc' },
      include: { currentCustomer: true },
      skip: (page - 1) * limit,
      take: limit
    })
  ]);

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="content">
      <div className="section-title flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/solo/vehicles" className="mr-3 p-1 -ml-1 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <span className="flex items-center"><AlertCircle className="w-5 h-5 mr-2 text-orange-500" /> Due for Service</span>
        </div>
      </div>
      
      <form method="GET" className="searchbar">
        <Search className="w-4 h-4" />
        <input 
          type="search" 
          name="q" 
          defaultValue={q} 
          placeholder="Search by plate, make, model or customer..." 
        />
        <input type="hidden" name="page" value="1" />
      </form>

      {vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--steel)' }}>
          <p>No vehicles due for service.</p>
        </div>
      ) : (
        <div style={{ marginTop: '12px' }}>
          {vehicles.map(v => {
            const isOverdue = v.nextServiceDate ? new Date(v.nextServiceDate) < new Date() : false;
            return (
              <div key={v.id} className="vehicle-card hover:border-orange-400 transition-all flex flex-col md:flex-row md:items-center justify-between p-4 mb-3 border rounded-xl bg-white shadow-sm">
                <Link href={`/solo/vehicles/${v.id}`} className="flex-1 flex items-start">
                  <div className="vicon mt-1">
                    <Car className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
                  </div>
                  <div>
                    <div className="vp">{v.registrationNumberNormalized || v.registrationNumberRaw}</div>
                    <div className="vm">
                      {v.manufacturer || "Unknown Make"} {v.model || ""} 
                      {v.currentCustomer?.displayName && ` • Owner: ${v.currentCustomer.displayName}`}
                    </div>
                    <div className={`text-xs font-bold mt-1 ${isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                      Due: {v.nextServiceDate ? dayjs(v.nextServiceDate).format("DD MMM YYYY") : "N/A"}
                    </div>
                  </div>
                </Link>
                
                {profile?.whatsappServiceDueTemplate && v.currentCustomer?.primaryMobile && (
                  <div className="mt-4 md:mt-0 md:ml-4">
                    <WhatsAppButton 
                      phoneNumber={v.currentCustomer.primaryMobile}
                      method={profile.whatsappMethod || 'click_to_chat'}
                      message={profile.whatsappServiceDueTemplate
                        .replace('{{customer_name}}', v.currentCustomer.displayName || 'Customer')
                        .replace('{{vehicle_no}}', v.registrationNumberRaw)}
                      label="Send Reminder"
                    />
                  </div>
                )}
              </div>
            );
          })}
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
