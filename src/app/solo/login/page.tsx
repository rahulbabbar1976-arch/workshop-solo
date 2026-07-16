"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";
import { InstallApp } from "@/components/InstallApp";

export default function SoloLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin]     = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@') && !/^\d{10}$/.test(email)) {
      setError("Please enter a valid email or 10-digit mobile number");
      return;
    }
    if (authMode === 'pin' && pin.length < 4) {
      setError("Please enter your 4-digit PIN");
      return;
    }
    if (authMode === 'password' && !password) {
      setError("Please enter your password");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, pin: authMode === 'pin' ? pin : undefined, password: authMode === 'password' ? password : undefined, authMode }),
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setError(data.error || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }
      
      // Redirect based on role
      const role = data.session?.primaryRole;
      if (role === 'super_admin') {
        window.location.href = '/autobot-admin';
      } else {
        window.location.href = '/solo/dashboard';
      }
      // Do NOT set loading to false here, keep the spinner active while router transitions
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white overflow-hidden relative font-outfit">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 z-10 relative">
        
        {/* Logo */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mx-auto w-24 h-24 bg-gray-800 rounded-[2rem] flex items-center justify-center mb-6 shadow-lg border border-gray-700">
            <span className="text-6xl font-black text-orange-500 font-sans">B</span>
          </div>
          <h1 className="text-2xl font-normal tracking-wide text-white mb-1 uppercase">
            Welcome to <span className="font-bold">BabbarSons</span>
          </h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase">Workshop Management System</p>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-sm mx-auto animate-in zoom-in-95 duration-500 delay-150">
          
          <div className="flex bg-gray-800 rounded-full p-1 mb-6 border border-gray-700">
            <button 
              type="button"
              onClick={() => setAuthMode('pin')}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${authMode === 'pin' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              PIN Login
            </button>
            <button 
              type="button"
              onClick={() => setAuthMode('password')}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${authMode === 'password' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              Password Login
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email / Mobile */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-500">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="text"
                id="email"
                autoComplete="email"
                className="block w-full pl-12 pr-5 py-4 bg-gray-800/50 border border-gray-700 rounded-full focus:border-orange-500 text-base text-white transition-all placeholder:text-gray-500 outline-none"
                placeholder="Email or Mobile"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
              />
            </div>

            {/* PIN or Password */}
            {authMode === 'pin' ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-500">
                  <KeyRound className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  id="pin"
                  autoComplete="current-password"
                  inputMode="numeric"
                  maxLength={6}
                  className="block w-full pl-12 pr-5 py-4 bg-gray-800/50 border border-gray-700 rounded-full focus:border-orange-500 text-2xl tracking-[0.5em] text-center text-white transition-all placeholder:text-gray-500 outline-none font-bold"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  className="block w-full pl-12 pr-5 py-4 bg-gray-800/50 border border-gray-700 rounded-full focus:border-orange-500 text-base text-white transition-all placeholder:text-gray-500 outline-none"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-red-300 shrink-0" />
                <p className="text-sm text-red-200 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || (authMode === 'pin' ? pin.length < 4 : !password)}
              className="w-full flex justify-center items-center py-4 px-4 rounded-full shadow-md text-lg font-bold text-white bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-60 mt-4 uppercase tracking-wider"
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Signing in...</span>
              ) : "Sign In"}
            </button>
            
            <div className="mt-6 text-center text-sm text-gray-400">
              <p>Don't have an account?</p>
              <Link href="/signup" className="font-bold text-orange-500 hover:text-orange-400 hover:underline mt-1 inline-block">
                Create a Workshop Account
              </Link>
            </div>
            
            <InstallApp />
            
          </form>
        </div>
      </div>
    </div>
  );
}
