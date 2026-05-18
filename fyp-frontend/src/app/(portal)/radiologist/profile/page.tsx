"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import GenericFormModal from '@/components/ui/GenericFormModal'; 
import { User, Lock, Mail, Phone, GraduationCap, Edit2, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// --- API IMPORTS ---
import { getRadiologistProfile, updateRadiologist } from '@/services/apiService';

export default function RadiologistProfile() {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true); // Loading state add ki

  // Display Data (API se populate hoga)
  const [userData, setUserData] = useState({
    id: 0, // Update k liye ID zaroori hai
    email: '',
    fullName: '',
    contact: '',
    qualification: 'MD, Board Certified Radiologist' // Backend me nahi tha toh default rakha
  });

  // ==========================================
  // 1. FETCH PROFILE DATA
  // ==========================================
  const loadProfile = async () => {
    try {
      const data = await getRadiologistProfile();
      setUserData({
        id: data.radiologistid,
        email: data.email,
        fullName: data.fullname,
        contact: data.contactnumber || 'Not Provided',
        qualification: 'MD, Board Certified Radiologist'
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // ==========================================
  // 2. UPDATE PROFILE DETAILS
  // ==========================================
  const handleProfileUpdate = async (formData: any) => {
    const toastId = toast.loading("Updating profile...");
    try {
      const payload = {
        fullname: formData.fullName,
        email: formData.email,
        contactnumber: formData.contact,
      };

      await updateRadiologist(userData.id, payload);
      
      // Local state update karo taake foran screen par change nazar aaye
      setUserData({ ...userData, ...formData }); 
      
      toast.success("Profile updated successfully! ✨", { id: toastId });
      setIsProfileModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile", { id: toastId });
    }
  };

  // ==========================================
  // 3. UPDATE PASSWORD
  // ==========================================
  const handlePasswordUpdate = async (formData: any) => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }

    const toastId = toast.loading("Updating security settings...");
    try {
      const payload = {
        password: formData.newPassword
      };

      await updateRadiologist(userData.id, payload);
      
      toast.success("Password changed securely! 🔒", { id: toastId });
      setIsPasswordModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update password", { id: toastId });
    }
  };

  // --- FIELDS CONFIGURATION ---
  const profileFields = [
    { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Dr. Jennifer Wong', required: true },
    { name: 'email', label: 'Email Address', type: 'email', placeholder: '(555) 111-2222', required: true },
    { name: 'contact', label: 'Contact Number', type: 'text', placeholder: '03001234567', required: true },
    // Qualification ko update karnay k liye agar backend endpoint support de toh add karna, warna disabled rakha ja sakta hai
  ];

  const passwordFields = [
    // Backend logic ke hisaab se agar "Current Password" verify karna zaroori nahi, toh isey hata bhi sakte ho
    { name: 'currentPassword', label: 'Current Password', type: 'password', placeholder: '........', required: false },
    { name: 'newPassword', label: 'New Password', type: 'password', placeholder: '........', required: true },
    { name: 'confirmPassword', label: 'Confirm New Password', type: 'password', placeholder: '........', required: true },
  ];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar 
        role="radiologist" 
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
              
              {/* 1. Personal Details Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-fit hover:shadow-md transition-shadow duration-300">
                  <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-5">
                          <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 shadow-sm shadow-indigo-100">
                              <User size={28} />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-800">Personal Information</h2>
                              <p className="text-sm text-slate-500 mt-1">Manage your personal details</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setIsProfileModalOpen(true)}
                          className="flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
                      >
                          <Edit2 size={16} /> Edit
                      </button>
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

                      {/* Qualification */}
                      <div className="group flex items-center gap-4 p-4 rounded-xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all">
                          <div className="bg-slate-100 p-2.5 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-indigo-500 transition-colors">
                              <GraduationCap size={20} />
                          </div>
                          <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Qualification</p>
                              <p className="text-slate-800 font-semibold">{userData.qualification}</p>
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

              {/* 2. Security Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-fit hover:shadow-md transition-shadow duration-300">
                  <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-5">
                          <div className="bg-rose-50 p-4 rounded-2xl text-rose-600 shadow-sm shadow-rose-100">
                              <Lock size={28} />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-800">Security</h2>
                              <p className="text-sm text-slate-500 mt-1">Password & Authentication</p>
                          </div>
                      </div>
                      <button 
                          onClick={() => setIsPasswordModalOpen(true)}
                          className="flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
                      >
                          <ShieldCheck size={16} /> Update
                      </button>
                  </div>

                  <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100">
                      <p className="text-slate-600 text-sm font-medium mb-3">Password Strength</p>
                      <div className="flex gap-1.5 mb-4">
                          {[...Array(4)].map((_, i) => <div key={i} className="flex-1 h-2 bg-emerald-500 rounded-full"></div>)}
                          <div className="flex-1 h-2 bg-slate-200 rounded-full"></div>
                      </div>
                      <p className="text-xs text-slate-400">
                          Last changed <span className="text-slate-700 font-bold">recently</span>. 
                          We recommend updating your password every 3 months.
                      </p>
                  </div>
              </div>
          </div>
        )}

        {/* --- MODALS --- */}
        <GenericFormModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            initialData={userData} 
            title="Edit Personal Information"
            fields={profileFields}
            onSubmit={handleProfileUpdate}
            submitLabel="Save Changes"
            />

        <GenericFormModal
            isOpen={isPasswordModalOpen}
            initialData={{}} 
            onClose={() => setIsPasswordModalOpen(false)}
            title="Change Password"
            fields={passwordFields}
            onSubmit={handlePasswordUpdate}
            submitLabel="Update Password"
        />

      </main>
    </div>
  );
}