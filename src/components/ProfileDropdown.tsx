"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Settings, LogOut, Car, Users, ClipboardList, CalendarClock, ChevronDown } from "lucide-react";

interface ProfileDropdownProps {
  userInitials: string;
  profilePhotoUrl?: string | null;
}

export default function ProfileDropdown({ userInitials, profilePhotoUrl }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { icon: ClipboardList, label: "Job Cards", href: "/solo/jobcards" },
    { icon: Users, label: "Customers", href: "/solo/customers" },
    { icon: Car, label: "Vehicles", href: "/solo/vehicles" },
    { icon: CalendarClock, label: "Bookings", href: "/solo/bookings" },
    { icon: Users, label: "Staff", href: "/solo/employees" },
    { icon: Settings, label: "Settings", href: "/solo/settings" },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-2xl bg-gray-800 border-2 border-gray-700 flex items-center justify-center overflow-hidden hover:border-orange-500 transition-colors shadow-md focus:outline-none"
      >
        {profilePhotoUrl ? (
          <Image src={profilePhotoUrl} alt="Avatar" width={56} height={56} className="object-cover" />
        ) : (
          <span className="font-black text-orange-500 text-xl tracking-wider">{userInitials}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="py-2">
            {menuItems.map((item, idx) => (
              <Link 
                key={idx} 
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <Link 
                href="/solo/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3 text-red-400" />
                <span className="font-medium">Sign Out</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
