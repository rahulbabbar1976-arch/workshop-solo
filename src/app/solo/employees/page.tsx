import React from 'react';
import EmployeesClient from './EmployeesClient';

export default function EmployeesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <p className="text-gray-500 text-sm">Manage staff profiles, roles, attendance, and payroll ledgers.</p>
      </div>
      <EmployeesClient />
    </div>
  );
}
