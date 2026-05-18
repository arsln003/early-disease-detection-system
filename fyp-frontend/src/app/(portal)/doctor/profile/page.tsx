"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { User, Lock, Mail, Phone, Stethoscope, Briefcase, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';

// --- API IMPORT ---
import { getDoctorProfileData } from '@/services/apiService';

export default function DoctorProfile() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Redux se current doctor ki id nikalo
  const { user } = useSelector((state: RootState) => state.auth);
  const doctorId = user?.id || user?.sub || user?.doctorid;

  // Display Data
  const [userData, setUserData] = useState({
    id: 0,
    email: '',
    fullName: '',
    contact: '',
    specialization: '',
    experience: '',
    status: 'Active'
  });

  // ==========================================
  // 1. FETCH DOCTOR PROFILE DATA
  // ==========================================
  const loadProfile = async () => {
    if (!doctorId) {
      setLoading(false);
      return;
    }

    try {
      const data = await getDoctorProfileData(doctorId);
      setUserData({
        id: data.doctorid || doctorId,
        email: data.email || 'N/A',
        fullName: data.fullname || data.name || 'N/A',
        contact: data.contactnumber || 'Not Provided',
        specialization: data.specialization || 'General',
        experience: data.experience ? `${data.experience} Years` : 'Not Specified',
        status: data.status || 'Active'
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to load doctor profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [doctorId]);

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar 
        role="doctor" 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header 
            title="My Profile" 
            onMenuClick={() => setSidebarOpen(true)} 
        />

        {loading ? (
          <div className="flex justify-center items-center h-64">
             <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* 1. Professional & Personal Details Card (Read-Only) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-fit hover:shadow-md transition-shadow duration-300">
                  <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-5">
                          <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 shadow-sm shadow-indigo-100">
                              <User size={28} />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-800">Professional Information</h2>
                              <p className="text-sm text-slate-500 mt-1">Your registered medical profile</p>
                          </div>
                      </div>
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

                      {/* Specialization */}
                      <div className="group flex items-center gap-4 p-4 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all">
                          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-indigo-500 transition-colors">
                              <Stethoscope size={20} />
                          </div>
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Specialization</p>
                              <p className="text-slate-800 font-semibold">{userData.specialization}</p>
                          </div>
                      </div>

                      {/* Experience */}
                      <div className="group flex items-center gap-4 p-4 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all">
                          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-indigo-500 transition-colors">
                              <Briefcase size={20} />
                          </div>
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Experience</p>
                              <p className="text-slate-800 font-semibold">{userData.experience}</p>
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

                      {/* Contact */}
                      <div className="group flex items-center gap-4 p-4 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all">
                          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-indigo-500 transition-colors">
                              <Phone size={20} />
                          </div>
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contact Number</p>
                              <p className="text-slate-800 font-semibold">{userData.contact}</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* 2. Security & Status Card (Read-Only) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-fit hover:shadow-md transition-shadow duration-300">
                  <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-5">
                          <div className="bg-rose-50 p-4 rounded-2xl text-rose-600 shadow-sm shadow-rose-100">
                              <Lock size={28} />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-800">Account Security</h2>
                              <p className="text-sm text-slate-500 mt-1">Protection & System Status</p>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100 mb-6">
                      <div className="flex items-center justify-between mb-3">
                          <p className="text-slate-600 text-sm font-bold">Password Status</p>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-md">Secured</span>
                      </div>
                      <div className="flex gap-1.5 mb-4">
                          {[...Array(4)].map((_, i) => <div key={i} className="flex-1 h-2 bg-emerald-500 rounded-full"></div>)}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                          Your account is protected with a secure password. If you need to update your credentials or face login issues, please contact the system administrator.
                      </p>
                  </div>

                  <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <ShieldCheck className="text-indigo-500" size={24} />
                              <div>
                                  <p className="text-slate-800 text-sm font-bold">System Status</p>
                                  <p className="text-xs text-slate-500">Current working state</p>
                              </div>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-lg ${userData.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {userData.status}
                          </span>
                      </div>
                  </div>

              </div>
          </div>
        )}
      </main>
    </div>
  );
}