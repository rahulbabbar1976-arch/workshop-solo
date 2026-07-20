'use client';
import React, { useState, useEffect } from 'react';

export default function RolesClient() {
  const [roles, setRoles] = useState<any[]>([]);
  const [editingRole, setEditingRole] = useState<any>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    const res = await fetch('/api/roles');
    const data = await res.json();
    if (data.success) {
      setRoles(data.roles);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    const res = await fetch('/api/roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingRole)
    });
    const data = await res.json();
    if (data.success) {
      setEditingRole(null);
      fetchRoles();
    } else {
      alert(data.error);
    }
  };

  const handleToggle = (field: string) => {
    if (editingRole) {
      setEditingRole({ ...editingRole, [field]: !editingRole[field] });
    }
  };

  return (
    <div className="flex gap-6 items-start">
      <div className="w-1/3 bg-white shadow rounded-xl overflow-hidden border">
        <div className="bg-gray-50 border-b p-4 font-bold">Select Role</div>
        <ul className="divide-y">
          {roles.map(role => (
            <li 
              key={role.id} 
              onClick={() => setEditingRole({ ...role })}
              className={`p-4 cursor-pointer transition ${editingRole?.id === role.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
            >
              <div className="font-semibold text-gray-800">{role.roleName}</div>
              <div className="text-xs text-gray-500">{role.description}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-2/3 bg-white shadow rounded-xl p-6 border">
        {editingRole ? (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold border-b pb-2 mb-4">Edit Permissions for {editingRole.roleName}</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition">
                  <div>
                    <div className="font-medium">Create Job Cards</div>
                    <div className="text-xs text-gray-500">Allow users with this role to create new job cards.</div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={editingRole.canCreateJobCard} onChange={() => handleToggle('canCreateJobCard')} />
                </label>
                
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition">
                  <div>
                    <div className="font-medium">Edit Job Cards</div>
                    <div className="text-xs text-gray-500">Allow users to modify existing job cards, adding labor and parts.</div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={editingRole.canEditJobCard} onChange={() => handleToggle('canEditJobCard')} />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition">
                  <div>
                    <div className="font-medium">Change Job Card Status</div>
                    <div className="text-xs text-gray-500">Allow users to mark job cards as completed, delivered, closed, etc.</div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={editingRole.canChangeJobCardStatus} onChange={() => handleToggle('canChangeJobCardStatus')} />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition">
                  <div>
                    <div className="font-medium">View Parts Prices</div>
                    <div className="text-xs text-gray-500">Show selling prices and totals for parts on job cards. If disabled, prices are hidden.</div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={editingRole.canViewPartPrices} onChange={() => handleToggle('canViewPartPrices')} />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 rounded border cursor-pointer hover:bg-gray-100 transition">
                  <div>
                    <div className="font-medium">View Labor Prices</div>
                    <div className="text-xs text-gray-500">Show selling prices and totals for labor on job cards. If disabled, prices are hidden.</div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={editingRole.canViewLaborPrices} onChange={() => handleToggle('canViewLaborPrices')} />
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setEditingRole(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-medium">Save Permissions</button>
            </div>
          </form>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            Select a role from the left to configure permissions.
          </div>
        )}
      </div>
    </div>
  );
}
