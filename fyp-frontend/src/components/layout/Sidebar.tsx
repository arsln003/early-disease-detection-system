"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useAppDispatch } from '@/lib/store/hooks';
import { logout } from '@/lib/store/features/authSlice';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  UploadCloud, 
  History, 
  User, 
  Stethoscope, 
  Users, 
  Activity, 
  FileText, 
  Bell, 
  X, 
  LogOut, 
  ChevronUp,
  LucideIcon // <-- Yahan LucideIcon ko import kiya TypeScript ke liye
} from 'lucide-react'; 

interface SidebarProps {
  role?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

// 1. Menu Item ka proper Type define kar diya
type MenuItem = {
  name: string;
  href: string;
  icon: LucideIcon;
};

const Sidebar: React.FC<SidebarProps> = ({ role, isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter(); 
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); 
  const dispatch = useAppDispatch();

  // 2. Menus object ko strict type de di (Record<string, MenuItem[]>)
  const menus: Record<string, MenuItem[]> = {
    admin: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Manage Doctors', href: '/admin/doctors', icon: Stethoscope },
      { name: 'Manage Patients', href: '/admin/patients', icon: Users },
      { name: 'Manage Radiologists', href: '/admin/radiologists', icon: Activity },
      { name: 'Profile', href: '/admin/profile', icon: User },
    ],
    doctor: [
      { name: 'Dashboard', href: '/doctor/dashboard', icon: LayoutDashboard },
      { name: 'Assigned Patients', href: '/doctor/patients', icon: Users },
      { name: 'Notifications', href: '/doctor/notifications', icon: Bell },
      { name: 'Profile', href: '/doctor/profile', icon: User },
    ],
    radiologist: [
      { name: 'Upload Report', href: '/radiologist/upload', icon: UploadCloud },
      { name: 'Upload History', href: '/radiologist/history', icon: History },
      { name: 'Profile', href: '/radiologist/profile', icon: User },
    ]
  };

  // 3. Fallback logic: Agar role undefined aaye toh default 'admin' use kare 
  // (Is se app crash hone se bach jayegi)
  const safeRole = role ? role.toLowerCase() : 'admin';
  const currentMenu = menus[safeRole] || menus.admin;

  // Logout Handler
  const handleLogout = () => {
    dispatch(logout());
    setIsUserMenuOpen(false); 
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity" />
      )}

      {/* Sidebar Container */}
      <div className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-indigo-600 tracking-tight">MediPortal</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">Healthcare Admin</p>
          </div>
          {/* Close Button for Mobile */}
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {currentMenu.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* User Footer (Interactive) */}
        <div className="p-4 border-t border-slate-50 relative">
           
           {/* LOGOUT POPUP CARD */}
           {isUserMenuOpen && (
             <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                    <LogOut size={18} />
                    Logout
                </button>
             </div>
           )}

           {/* User Profile Trigger */}
           <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                    isUserMenuOpen 
                    ? 'bg-slate-50 border-indigo-200 ring-2 ring-indigo-500/10' 
                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'
                }`}
           >
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shadow-sm shrink-0">
                  {safeRole.charAt(0).toUpperCase()}
              </div>
              
              <div className="overflow-hidden text-left flex-1">
                  <p className="text-sm font-bold text-slate-700 capitalize truncate">{safeRole} User</p>
                  <p className="text-xs text-slate-400 truncate">active session</p>
              </div>

              {/* Chevron Icon that rotates */}
              <ChevronUp size={16} className={`text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
           </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;