"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import StatsCard from '@/components/ui/StatsCard';
import { 
  Users, Stethoscope, FileText, AlertCircle, Loader2, RefreshCw, 
  Server, Zap, ShieldCheck, Activity, UserPlus, FileSearch, Settings 
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store/store';
import { fetchAdminStats } from '@/lib/store/features/adminSlice';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  const dispatch = useDispatch<AppDispatch>();
  const { stats, isLoading } = useSelector((state: RootState) => state.admin);

  useEffect(() => {
    // Sirf stats mangwa rahe hain ab
    dispatch(fetchAdminStats());
  }, [dispatch]);

  const handleRefresh = async () => {
    toast.promise(
      dispatch(fetchAdminStats()).unwrap(),
      {
        loading: 'Syncing live data...',
        success: 'System Overview updated!',
        error: 'Failed to sync data',
      }
    );
  };

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar 
        role="admin" 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        
        <Header 
          title="Admin Command Center" 
          onMenuClick={() => setSidebarOpen(true)} 
        />

        {/* Dashboard Title & Refresh */}
        <div className="flex justify-between items-end mb-6 mt-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">System Overview</h2>
            <p className="text-sm text-slate-500">Live statistics and platform health monitoring.</p>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? "Syncing..." : "Refresh"}
          </button>
        </div>

        {/* 1. TOP STATS GRID */}
        {isLoading && (!stats || Object.keys(stats).length === 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
               <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl border border-slate-100"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard title="Total Doctors" value={stats.totalDoctors || 0} icon={Stethoscope} colorClass="text-indigo-600" />
            <StatsCard title="Total Patients" value={stats.totalPatients || 0} icon={Users} colorClass="text-emerald-600" />
            <StatsCard title="Total Reports" value={stats.totalReports || 0} icon={FileText} colorClass="text-amber-600" />
            <StatsCard title="Critical Cases" value={stats.criticalCases || 0} icon={AlertCircle} colorClass="text-rose-600" />
          </div>
        )}

        {/* 2. MIDDLE DASHBOARD WIDGETS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Left: AI Models Health Status */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <Server size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">AI Diagnostic Models</h3>
                <p className="text-xs font-medium text-slate-500">Live operational status</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              {/* OCR Model */}
              <div className="border border-slate-100 bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <div className="relative mb-3">
                  <Activity className="text-indigo-500" size={28} />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-50 animate-pulse"></span>
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Cardiovascular OCR</h4>
                <p className="text-xs text-emerald-600 font-semibold mt-1 bg-emerald-100 px-2 py-0.5 rounded-md">Online</p>
              </div>

              {/* Stroke Model */}
              <div className="border border-slate-100 bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <div className="relative mb-3">
                  <Zap className="text-amber-500" size={28} />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-50 animate-pulse"></span>
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Stroke Detection</h4>
                <p className="text-xs text-emerald-600 font-semibold mt-1 bg-emerald-100 px-2 py-0.5 rounded-md">Online</p>
              </div>

              {/* CADICA Model */}
              <div className="border border-slate-100 bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <div className="relative mb-3">
                  <ShieldCheck className="text-rose-500" size={28} />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-50 animate-pulse"></span>
                </div>
                <h4 className="font-bold text-slate-700 text-sm">CADICA Angiography</h4>
                <p className="text-xs text-emerald-600 font-semibold mt-1 bg-emerald-100 px-2 py-0.5 rounded-md">Online</p>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="bg-slate-900 rounded-2xl shadow-sm p-6 text-white flex flex-col">
            <h3 className="text-lg font-bold mb-1">Quick Actions</h3>
            <p className="text-slate-400 text-xs font-medium mb-6">Frequently used tools</p>
            
            <div className="grid grid-cols-2 gap-3 flex-1">
              <button className="bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 transition-all duration-300 rounded-xl p-3 flex flex-col items-center justify-center gap-2 group">
                <UserPlus size={20} className="text-slate-400 group-hover:text-white" />
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Add Doctor</span>
              </button>
              <button className="bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 transition-all duration-300 rounded-xl p-3 flex flex-col items-center justify-center gap-2 group">
                <Users size={20} className="text-slate-400 group-hover:text-white" />
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Patients</span>
              </button>
              <button className="bg-slate-800 hover:bg-rose-600 border border-slate-700 hover:border-rose-500 transition-all duration-300 rounded-xl p-3 flex flex-col items-center justify-center gap-2 group">
                <FileSearch size={20} className="text-slate-400 group-hover:text-white" />
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Reports</span>
              </button>
              <button className="bg-slate-800 hover:bg-amber-600 border border-slate-700 hover:border-amber-500 transition-all duration-300 rounded-xl p-3 flex flex-col items-center justify-center gap-2 group">
                <Settings size={20} className="text-slate-400 group-hover:text-white" />
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Settings</span>
              </button>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}