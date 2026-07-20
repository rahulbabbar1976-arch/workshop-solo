'use client';
import React, { useState, useEffect } from 'react';

export default function EmployeesClient() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const [formData, setFormData] = useState({
    id: '',
    fullName: '',
    username: '',
    email: '',
    mobile: '',
    address: '',
    team: '',
    skillCategory: '',
    password: '',
    joiningDate: '',
    roleKeys: [] as string[],
    isActive: true,
    isAppAccessEnabled: true
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success) {
      setEmployees(data.users);
      setRoles(data.roles);
    }
  };

  const openModal = () => {
    setFormData({
      id: '', fullName: '', username: '', email: '', mobile: '', address: '', team: '', skillCategory: '', password: '', joiningDate: '', roleKeys: [], isActive: true, isAppAccessEnabled: true
    });
    setActiveTab('details');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = '/api/users';
    const method = 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (data.success) {
      setShowModal(false);
      fetchEmployees();
    } else {
      alert(data.error);
    }
  };

  return (
    <div>
      <button onClick={() => openModal()} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700">
        + Add Employee
      </button>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Team / Skill</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Access</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{emp.fullName}</div>
                  <div className="text-xs text-gray-500">{emp.username}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div>{emp.mobile}</div>
                  <div>{emp.email}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="font-semibold">{emp.team || '-'}</div>
                  <div className="text-xs">{emp.skillCategory || '-'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${emp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {emp.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {!emp.isAppAccessEnabled && (
                    <span className="block mt-1 text-[10px] text-red-500">App Login Disabled</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <a href={`/solo/employees/${emp.id}`} className="text-blue-600 hover:text-blue-800 font-semibold text-sm">
                    View Profile &rarr;
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">New Employee</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="empForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input required className="w-full px-3 py-2 border rounded" value={formData.fullName} onChange={e=>setFormData({...formData, fullName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input className="w-full px-3 py-2 border rounded" value={formData.mobile} onChange={e=>setFormData({...formData, mobile: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username (for login)</label>
                    <input className="w-full px-3 py-2 border rounded" value={formData.username} onChange={e=>setFormData({...formData, username: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" required placeholder="Required" className="w-full px-3 py-2 border rounded" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
              <button type="submit" form="empForm" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Employee</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
