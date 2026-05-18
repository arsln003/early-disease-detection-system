"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // LocalStorage se token uthao
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      // Agar token nahi hai, toh user ko Login page par phaink do
      router.replace('/');
    } else {
      // Agar token hai, toh UI render hone do
      setIsAuthenticated(true);
    }
  }, [router, pathname]);

  // Jab tak token check ho raha hai, tab tak loading spinner dikhao 
  // taake bina login wala banda ek second ke liye bhi andar ka page na dekh sake
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  // Check pass ho gaya, ab actual page dikhao
  return <>{children}</>;
}