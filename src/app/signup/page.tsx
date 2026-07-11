"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, ShieldCheck, User, Building, MapPin } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    identifier: "",
    workshopName: "",
    addressLine1: "",
    city: "",
    pin: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.identifier || !formData.workshopName || !formData.pin) {
      setError("Please fill in all required fields");
      return;
    }
    if (formData.pin.length < 4) {
      setError("PIN must be 4 digits");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setError(data.error || 'Signup failed.');
        return;
      }
      
      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push('/solo/login');
      }, 2000);
      
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-teal-500 text-white overflow-hidden relative font-outfit">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 z-10 relative">
        
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-wide">
            Create an Account
          </h1>
          <p className="text-teal-100 text-sm max-w-md mx-auto">
            Sign up to manage your workshop. Note: You must be invited by an administrator to create an account.
          </p>
        </div>

        {/* Signup Form */}
        <div className="w-full max-w-md mx-auto animate-in zoom-in-95 duration-500 delay-150">
          <form onSubmit={handleSignup} className="space-y-4">
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-teal-300">
                <User className="h-5 w-5" />
              </div>
              <input
                type="text"
                id="fullName"
                required
                className="block w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-teal-400 rounded-xl focus:border-white text-base text-white transition-all placeholder:text-teal-200 outline-none"
                placeholder="Full Name *"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-teal-300">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="text"
                id="identifier"
                required
                className="block w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-teal-400 rounded-xl focus:border-white text-base text-white transition-all placeholder:text-teal-200 outline-none"
                placeholder="Email or Mobile Number *"
                value={formData.identifier}
                onChange={handleChange}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-teal-300">
                <Building className="h-5 w-5" />
              </div>
              <input
                type="text"
                id="workshopName"
                required
                className="block w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-teal-400 rounded-xl focus:border-white text-base text-white transition-all placeholder:text-teal-200 outline-none"
                placeholder="Workshop Name *"
                value={formData.workshopName}
                onChange={handleChange}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-teal-300">
                <MapPin className="h-5 w-5" />
              </div>
              <input
                type="text"
                id="addressLine1"
                className="block w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-teal-400 rounded-xl focus:border-white text-base text-white transition-all placeholder:text-teal-200 outline-none"
                placeholder="Address"
                value={formData.addressLine1}
                onChange={handleChange}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-teal-300">
                <MapPin className="h-5 w-5" />
              </div>
              <input
                type="text"
                id="city"
                className="block w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-teal-400 rounded-xl focus:border-white text-base text-white transition-all placeholder:text-teal-200 outline-none"
                placeholder="City"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-teal-300">
                <KeyRound className="h-5 w-5" />
              </div>
              <input
                type="password"
                id="pin"
                required
                inputMode="numeric"
                maxLength={4}
                className="block w-full pl-11 pr-4 py-3 bg-white/10 border-2 border-teal-400 rounded-xl focus:border-white text-2xl tracking-[0.5em] text-white transition-all placeholder:text-teal-200 outline-none font-bold"
                placeholder="••••"
                value={formData.pin}
                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
              />
              <p className="text-xs text-teal-200 mt-1 pl-2">Set a 4-digit PIN for login</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-red-300 shrink-0" />
                <p className="text-sm text-red-200 font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 bg-emerald-500/40 border border-emerald-400/60 rounded-xl px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-emerald-100 shrink-0" />
                <p className="text-sm text-emerald-50 font-medium">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-md text-lg font-bold text-teal-600 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60 mt-4 uppercase tracking-wider"
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full"></span> Creating Account...</span>
              ) : "Sign Up"}
            </button>
            
            <div className="mt-6 text-center text-sm text-teal-100">
              <p>Already have an account?</p>
              <Link href="/solo/login" className="font-bold text-white hover:underline mt-1 inline-block">
                Back to Login
              </Link>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
