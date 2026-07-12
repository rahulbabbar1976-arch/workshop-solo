"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Package, Calendar, Wrench, CheckCircle } from "lucide-react";
import { getNotifications } from "@/actions/getNotifications";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getNotifications().then(data => {
      setNotifications(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'part': return <Package className="w-5 h-5 text-orange-500" />;
      case 'delivery': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'service': return <Wrench className="w-5 h-5 text-gray-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setOpen(!open)}
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white relative transition-colors ${open ? 'bg-gray-700 border-orange-500 border' : 'bg-gray-800 border-gray-700 border hover:border-orange-500'}`}
      >
        <Bell className="w-5 h-5" />
        {notifications.length > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-gray-900 px-4 py-3 flex justify-between items-center">
            <h3 className="font-bold text-white tracking-wide">Notifications</h3>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{notifications.length}</span>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-500 text-sm animate-pulse">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No new notifications.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(notif => (
                  <div key={notif.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-3 cursor-pointer">
                    <div className="mt-0.5 bg-gray-100 p-2 rounded-full h-fit">
                      {getIcon(notif.type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{notif.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <span className="text-[10px] text-gray-400 mt-2 block font-mono">{new Date(notif.time).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-gray-100 text-center">
            <button className="text-xs font-bold text-orange-500 uppercase hover:text-orange-600 transition-colors py-1">View All</button>
          </div>
        </div>
      )}
    </div>
  );
}
