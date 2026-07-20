'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Shield, Calendar, DollarSign, Loader2, Save, MapPin, Phone, Briefcase, Key } from 'lucide-react';

export default function EmployeeProfileClient({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [employee, setEmployee] = useState<any>(null);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    fullName: '', username: '', email: '', mobile: '', address: '',
    team: '', skillCategory: '', joiningDate: '', isActive: true, isAppAccessEnabled: true,
    roleKeys: [] as string[]
  });

  const [attendance, setAttendance] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [payrollForm, setPayrollForm] = useState({ amount: '', type: 'Salary', description: '' });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRes, rolesRes, attRes, payRes] = await Promise.all([
        fetch(`/api/users/${id}`),
        fetch('/api/users'),
        fetch(`/api/attendance?userId=${id}`),
        fetch(`/api/payroll?userId=${id}`)
      ]);
      
      const userData = await userRes.json();
      const rolesData = await rolesRes.json();
      const attData = await attRes.json();
      const payData = await payRes.json();
      
      if (userData.success) {
        const emp = userData.user;
        setEmployee(emp);
        setFormData({
          fullName: emp.fullName || '',
          username: emp.username || '',
          email: emp.email || '',
          mobile: emp.mobile || '',
          address: emp.address || '',
          team: emp.team || '',
          skillCategory: emp.skillCategory || '',
          joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
          isActive: emp.isActive,
          isAppAccessEnabled: emp.isAppAccessEnabled,
          roleKeys: emp.roles?.map((r: any) => r.role?.roleKey) || []
        });
      }
      if (rolesData.success) setAllRoles(rolesData.roles);
      if (attData.success) setAttendance(attData.logs);
      if (payData.success) setPayroll(payData.ledgers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/users`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...formData })
    });
    const data = await res.json();
    if (data.success) {
      alert("Profile updated successfully!");
      fetchData();
    } else {
      alert(data.error);
    }
  };

  const markAttendance = async (status: string) => {
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, date: new Date(), status, clockIn: status === 'Present' ? new Date() : null })
    });
    const attRes = await fetch(`/api/attendance?userId=${id}`);
    const attData = await attRes.json();
    if (attData.success) setAttendance(attData.logs);
  };

  const addPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, transactionDate: new Date(), transactionType: payrollForm.type, amount: payrollForm.amount, description: payrollForm.description })
    });
    setPayrollForm({ amount: '', type: 'Salary', description: '' });
    const payRes = await fetch(`/api/payroll?userId=${id}`);
    const payData = await payRes.json();
    if (payData.success) setPayroll(payData.ledgers);
  };

  if (loading) return <div className="flex justify-center items-center h-screen bg-gray-100"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /></div>;
  if (!employee) return <div className="p-8 text-center bg-gray-100 min-h-screen font-outfit">Employee not found.</div>;

  return (
    <div className="min-h-screen bg-gray-100 pb-24 font-outfit">
      <div className="bg-gray-900 px-4 py-4 shadow-md flex justify-between items-center sticky top-0 z-30 text-white">
        <div className="flex items-center">
          <Link href="/solo/employees" className="mr-3 p-2 -ml-2 hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider">{employee.fullName}</h1>
            <p className="text-gray-400 text-xs font-semibold">{employee.team || 'No Team'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex space-x-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200 mb-6 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm tracking-wide transition-colors flex items-center justify-center whitespace-nowrap ${activeTab === 'overview' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <User className="w-4 h-4 mr-2" /> Overview
          </button>
          <button onClick={() => setActiveTab('access')} className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm tracking-wide transition-colors flex items-center justify-center whitespace-nowrap ${activeTab === 'access' ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Shield className="w-4 h-4 mr-2" /> Access & Roles
          </button>
          <button onClick={() => setActiveTab('attendance')} className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm tracking-wide transition-colors flex items-center justify-center whitespace-nowrap ${activeTab === 'attendance' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Calendar className="w-4 h-4 mr-2" /> Attendance
          </button>
          <button onClick={() => setActiveTab('payroll')} className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm tracking-wide transition-colors flex items-center justify-center whitespace-nowrap ${activeTab === 'payroll' ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <DollarSign className="w-4 h-4 mr-2" /> Payroll
          </button>
        </div>

        {activeTab === 'overview' && (
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 animate-in fade-in duration-300">
            <h2 className="text-lg font-extrabold text-gray-800 uppercase border-b border-gray-100 pb-3 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-orange-500" /> General Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Full Name</label>
                <input required className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-orange-500 font-semibold" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-orange-500 font-semibold" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-orange-500 font-semibold" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Joining Date</label>
                <input type="date" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-orange-500 font-semibold text-gray-600" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Team</label>
                <input className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-orange-500 font-semibold" value={formData.team} onChange={e => setFormData({...formData, team: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Skill Category</label>
                <input className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-orange-500 font-semibold" value={formData.skillCategory} onChange={e => setFormData({...formData, skillCategory: e.target.value})} />
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg uppercase tracking-wider text-sm flex items-center transition-colors">
                <Save className="w-4 h-4 mr-2" /> Save Details
              </button>
            </div>
          </form>
        )}

        {activeTab === 'access' && (
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 animate-in fade-in duration-300">
            <h2 className="text-lg font-extrabold text-gray-800 uppercase border-b border-gray-100 pb-3 flex items-center">
              <Key className="w-5 h-5 mr-2 text-teal-500" /> Account Access & Permissions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formData.isActive ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <div className="ml-4">
                    <div className="font-bold text-gray-800">Account Active</div>
                    <div className="text-xs text-gray-500 font-semibold">Enable or disable profile globally</div>
                  </div>
                </label>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={formData.isAppAccessEnabled} onChange={e => setFormData({...formData, isAppAccessEnabled: e.target.checked})} />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${formData.isAppAccessEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formData.isAppAccessEnabled ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <div className="ml-4">
                    <div className="font-bold text-gray-800">App Login Access</div>
                    <div className="text-xs text-gray-500 font-semibold">Allow logging into workshop-solo</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">Granular Roles</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allRoles.map(role => (
                  <label key={role.roleKey} className="flex items-start p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:border-teal-400 transition-colors">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                      checked={formData.roleKeys.includes(role.roleKey)}
                      onChange={e => {
                        const checked = e.target.checked;
                        if (checked) setFormData({ ...formData, roleKeys: [...formData.roleKeys, role.roleKey] });
                        else setFormData({ ...formData, roleKeys: formData.roleKeys.filter(k => k !== role.roleKey) });
                      }}
                    />
                    <div className="ml-3">
                      <span className="block font-bold text-gray-800 text-sm uppercase">{role.roleName}</span>
                      <span className="block text-xs text-gray-500 font-semibold leading-snug mt-0.5">{role.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg uppercase tracking-wider text-sm flex items-center transition-colors">
                <Save className="w-4 h-4 mr-2" /> Save Access
              </button>
            </div>
          </form>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 animate-in fade-in duration-300">
             <div className="flex justify-between items-center border-b border-gray-100 pb-3">
               <h2 className="text-lg font-extrabold text-gray-800 uppercase flex items-center">
                 <Calendar className="w-5 h-5 mr-2 text-blue-500" /> Attendance Calendar
               </h2>
               <div className="flex gap-2">
                 <button onClick={() => markAttendance('Present')} className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors">Mark Present</button>
                 <button onClick={() => markAttendance('Absent')} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors">Mark Absent</button>
                 <button onClick={() => markAttendance('Leave')} className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors">Mark Leave</button>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {attendance.length === 0 ? (
                 <p className="text-gray-500 font-semibold col-span-2 text-center py-10">No attendance logs found.</p>
               ) : (
                 attendance.map((log: any) => (
                   <div key={log.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
                     <div>
                       <span className="font-bold text-gray-800 block">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                       {log.clockIn && <span className="text-xs text-gray-500 font-semibold">In: {new Date(log.clockIn).toLocaleTimeString()}</span>}
                     </div>
                     <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded ${log.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : log.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                       {log.status}
                     </span>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {activeTab === 'payroll' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 animate-in fade-in duration-300">
             <h2 className="text-lg font-extrabold text-gray-800 uppercase border-b border-gray-100 pb-3 flex items-center">
               <DollarSign className="w-5 h-5 mr-2 text-emerald-500" /> Performance & Payroll Ledger
             </h2>
             
             <form onSubmit={addPayroll} className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
               <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                 <select value={payrollForm.type} onChange={e => setPayrollForm({...payrollForm, type: e.target.value})} className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:border-emerald-500 font-semibold">
                   <option>Salary</option>
                   <option>Bonus</option>
                   <option>Deduction</option>
                   <option>Advance</option>
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-500 uppercase">Amount</label>
                 <input type="number" required value={payrollForm.amount} onChange={e => setPayrollForm({...payrollForm, amount: e.target.value})} className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:border-emerald-500 font-semibold" placeholder="0.00" />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                 <input type="text" required value={payrollForm.description} onChange={e => setPayrollForm({...payrollForm, description: e.target.value})} className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg focus:border-emerald-500 font-semibold" placeholder="Details..." />
               </div>
               <button type="submit" className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg uppercase tracking-wider text-sm transition-colors">
                 Add Record
               </button>
             </form>

             <div className="overflow-x-auto border border-gray-200 rounded-lg">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-gray-50">
                     <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">Date</th>
                     <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">Type</th>
                     <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">Description</th>
                     <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase border-b border-gray-200 text-right">Amount</th>
                   </tr>
                 </thead>
                 <tbody>
                   {payroll.length === 0 ? (
                     <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 font-semibold">No records found.</td></tr>
                   ) : (
                     payroll.map(p => (
                       <tr key={p.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                         <td className="px-4 py-3 text-sm font-semibold text-gray-800">{new Date(p.transactionDate).toLocaleDateString()}</td>
                         <td className="px-4 py-3">
                           <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${p.transactionType === 'Bonus' ? 'bg-emerald-100 text-emerald-700' : p.transactionType === 'Deduction' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                             {p.transactionType}
                           </span>
                         </td>
                         <td className="px-4 py-3 text-sm font-medium text-gray-600">{p.description}</td>
                         <td className={`px-4 py-3 text-sm font-bold text-right ${p.transactionType === 'Deduction' ? 'text-red-600' : 'text-gray-800'}`}>
                           {p.transactionType === 'Deduction' ? '-' : ''}{p.amount}
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
