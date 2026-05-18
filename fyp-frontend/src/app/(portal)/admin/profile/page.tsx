"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { User, Lock, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

// --- API IMPORT ---
import { getAdminProfile } from '@/services/apiService';

export default function AdminProfile() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Redux se current admin ki id nikalo
  const { user } = useSelector((state: RootState) => state.auth);
  const adminId = user?.id || user?.sub || user?.adminid;

  // Display Data
  const [userData, setUserData] = useState({
    id: 0,
    email: '',
    fullName: '',
    role: 'System Administrator'
  });

  // ==========================================
  // 1. FETCH ADMIN PROFILE DATA
  // ==========================================
  const loadProfile = async () => {
    if (!adminId) {
      setLoading(false);
      return;
    }

    try {
      const data = await getAdminProfile(adminId);
      setUserData({
        id: data.adminid || adminId,
        email: data.email || 'N/A',
        fullName: data.fullname || data.name || 'N/A',
        role: 'System Administrator' // Default role label
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to load admin profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [adminId]);

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar 
        role="admin" 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header 
            title="Admin Profile" 
            onMenuClick={() => setSidebarOpen(true)} 
        />

        {loading ? (
          <div className="flex justify-center items-center h-64">
             <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* 1. Personal Details Card (Read-Only) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-fit hover:shadow-md transition-shadow duration-300">
                  <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-5">
                          <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 shadow-sm shadow-indigo-100">
                              <User size={28} />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-800">Personal Information</h2>
                              <p className="text-sm text-slate-500 mt-1">Your registered system details</p>
                          </div>
                      </div>
                      {/* Edit button removed as per requirements */}
                  </div>

                  <div className="space-y-6">
                      {/* Full Name */}
                      <div className="group flex items-center gap-4 p-4 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all">
                          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-indigo-500 transition-colors">
                              <User size={20} />
                          </div>
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Full Name</p>
                              <p className="text-slate-800 font-semibold">{userData.fullName}</p>
                          </div>
                      </div>

                      {/* Email */}
                      <div className="group flex items-center gap-4 p-4 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all">
                          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-indigo-500 transition-colors">
                              <Mail size={20} />
                          </div>
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email Address</p>
                              <p className="text-slate-800 font-semibold">{userData.email}</p>
                          </div>
                      </div>

                      {/* Role/Access Level */}
                      <div className="group flex items-center gap-4 p-4 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all">
                          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-indigo-500 transition-colors">
                              <ShieldCheck size={20} />
                          </div>
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Access Level</p>
                              <p className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-lg inline-block mt-1">
                                {userData.role}
                              </p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* 2. Security Card (Read-Only) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-fit hover:shadow-md transition-shadow duration-300">
                  <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-5">
                          <div className="bg-rose-50 p-4 rounded-2xl text-rose-600 shadow-sm shadow-rose-100">
                              <Lock size={28} />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-800">Security</h2>
                              <p className="text-sm text-slate-500 mt-1">Account protection status</p>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                          <p className="text-slate-600 text-sm font-bold">Password Status</p>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-md">Secured</span>
                      </div>
                      <div className="flex gap-1.5 mb-4">
                          {[...Array(4)].map((_, i) => <div key={i} className="flex-1 h-2 bg-emerald-500 rounded-full"></div>)}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                          Your administrative account is protected with a secure password. If you need to change your credentials, please contact the super-admin or IT department.
                      </p>
                  </div>
              </div>
          </div>
        )}
      </main>
    </div>
  );
}