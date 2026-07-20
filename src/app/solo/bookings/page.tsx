import React from 'react';
import BookingsClient from './BookingsClient';

export default function BookingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bookings & Appointments</h1>
        <p className="text-gray-500 text-sm">Manage scheduled vehicle pickups and drops.</p>
      </div>
      <BookingsClient />
    </div>
  );
}
