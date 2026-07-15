import Link from "next/link";
import { Calendar, FileText, PieChart, Users } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="content pb-32">
      <div className="section-title">Reports</div>
      <p className="text-gray-500 text-sm mb-6">Select a report to view insights for your workshop.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <Link href="/solo/reports/service-due" className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-orange-500 transition-colors flex items-start">
          <div className="bg-orange-100 p-3 rounded-lg text-orange-600 mr-4">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Service Due</h3>
            <p className="text-gray-500 text-sm mt-1">List of vehicles with upcoming or past due service dates.</p>
          </div>
        </Link>

        {/* Future Reports */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm opacity-60 flex items-start">
          <div className="bg-gray-200 p-3 rounded-lg text-gray-500 mr-4">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Revenue Summary</h3>
            <p className="text-gray-500 text-sm mt-1">Coming soon.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
