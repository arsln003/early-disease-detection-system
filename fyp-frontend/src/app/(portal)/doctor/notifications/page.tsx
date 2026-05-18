"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AlertCircle, Bell, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useRouter } from 'next/navigation'; // <-- NEW: Router zaroori hai agar patient page par jana ho
import NotificationModal from '@/components/ui/NotificationModal';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: string;
  patientId?: string; // <-- NEW: Added in interface
  patientName?: string; // <-- NEW: Added in interface
  modelName?: string; // <-- NEW: Added in interface
  reportId?: string; // <-- NEW: Added in interface
}

export default function Notifications() {
  const router = useRouter(); // <-- NEW
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<any>(null); // State for modal

  // Current user nikalo taake uski hi list khule
  const { user } = useSelector((state: RootState) => state.auth);
  const actualDoctorId = user?.id || user?.sub || user?.doctorid;
  const storageKey = `doctor_notifications_${actualDoctorId}`;

  // LocalStorage parhne ka function
  const loadNotifications = () => {
    if (actualDoctorId) {
      const saved = localStorage.getItem(storageKey);
      if (saved) setNotifications(JSON.parse(saved));
    }
  };

  useEffect(() => {
    loadNotifications();

    // Jab GlobalListener naya notification laye toh page refresh karo
    window.addEventListener('new_notification', loadNotifications);
    return () => window.removeEventListener('new_notification', loadNotifications);
  }, [actualDoctorId]);

  const clearAll = () => {
    setNotifications([]);
    if (actualDoctorId) {
      localStorage.removeItem(storageKey);
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar role="doctor" isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header title="Notifications" onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <p className="text-slate-500 font-medium">
              {notifications.length === 0 ? 'You are all caught up!' : `You have ${notifications.length} notifications`}
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={clearAll}
              disabled={notifications.length === 0}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 border rounded-xl text-sm font-semibold transition-colors shadow-sm ${notifications.length === 0 ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-100 hover:bg-red-50'
                }`}
            >
              <Trash2 size={18} /> Clear All
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 border-dashed">
              <Bell className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-slate-400 font-medium">No new notifications.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                // 🔥 YAHAN ONCLICK LAGA DIYA
                onClick={() => {
                  if (notif.patientId && notif.modelName && notif.reportId) {
                    setSelectedNotif(notif);
                  } else if (notif.patientId) {
                    // Agar simple notification ho to direct patient profile par le jao
                    router.push(`/doctor/patient/${notif.patientId}`);
                  }
                }}
                className="group bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex gap-5 transition-all duration-300 hover:shadow-md cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border text-indigo-600 bg-indigo-50 border-indigo-100 transition-transform group-hover:scale-105">
                  <AlertCircle size={22} />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-base text-slate-800">
                      {notif.title}
                      <span className="inline-block w-2.5 h-2.5 bg-indigo-500 rounded-full ml-3 mb-0.5 shadow-sm shadow-indigo-200 animate-pulse"></span>
                    </h4>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap ml-2">{notif.time}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{notif.desc}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 🔥 MODAL ADD KAR DIYA YAHAN PAR */}
        {/* 🔥 MODAL ADD KAR DIYA YAHAN PAR */}
        <NotificationModal
          isOpen={!!selectedNotif}
          onClose={() => setSelectedNotif(null)}
          reportId={selectedNotif?.reportId || null}
          patientId={selectedNotif?.patientId || null}
          patientName={selectedNotif?.patientName || null}
          // Backend se aaye hue modelName ko normalize kar rahe hain
          modelName={
            selectedNotif?.modelName?.includes('Cardio') ? 'Cardiovascular' :
              selectedNotif?.modelName?.includes('Stroke') ? 'Stroke' :
                'CADICA'
          }
        />

      </main>
    </div>
  );
}