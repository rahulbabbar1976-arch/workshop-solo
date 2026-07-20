"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, ArrowUpDown } from "lucide-react";

interface SortOption {
  label: string;
  value: string;
}

interface FilterOption {
  label: string;
  value: string;
}

interface SortFilterBarProps {
  sortOptions?: SortOption[];
  filterOptions?: FilterOption[];
  filterParamName?: string;
}

export default function SortFilterBar({
  sortOptions = [
    { label: "Date: Newest First", value: "date_desc" },
    { label: "Date: Oldest First", value: "date_asc" },
    { label: "Name: A to Z", value: "name_asc" },
    { label: "Name: Z to A", value: "name_desc" },
  ],
  filterOptions = [],
  filterParamName = "status"
}: SortFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") || "date_desc";
  const currentFilter = searchParams.get(filterParamName) || "";

  const handleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // reset page to 1 when changing filters/sort
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full bg-white p-3 rounded-xl shadow-sm border border-gray-200 mt-4 mb-4">
      {/* Sort Select */}
      <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <ArrowUpDown className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
        <select 
          className="bg-transparent w-full text-sm font-medium text-gray-700 outline-none appearance-none"
          value={currentSort}
          onChange={(e) => handleChange("sort", e.target.value)}
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Filter Select */}
      {filterOptions.length > 0 && (
        <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Filter className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
          <select 
            className="bg-transparent w-full text-sm font-medium text-gray-700 outline-none appearance-none"
            value={currentFilter}
            onChange={(e) => handleChange(filterParamName, e.target.value)}
          >
            <option value="">All States</option>
            {filterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
