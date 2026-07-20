import React from 'react';
import RolesClient from './RolesClient';

export default function RolesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        <p className="text-gray-500 text-sm">Configure access control and feature permissions for each role.</p>
      </div>
      <RolesClient />
    </div>
  );
}
