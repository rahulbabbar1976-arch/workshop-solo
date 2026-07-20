import React from 'react';
import EmployeeProfileClient from './EmployeeProfileClient';

export default function EmployeeProfilePage({ params }: { params: { id: string } }) {
  return <EmployeeProfileClient id={params.id} />;
}
