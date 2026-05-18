"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store/store';
import { saveDoctorFcmToken } from '@/lib/store/features/doctorSlice';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

// 🔥 Update kiya hua import
import { getFirebaseMessaging, getToken, onMessage } from '@/lib/firebase'; 

export default function GlobalNotificationListener() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const actualDoctorId = user?.id || user?.sub || user?.doctorid;
    const isDoctor = user && (user.role === 'doctor' || user.doctorid || user.specialization);

    if (!isDoctor || !actualDoctorId) return;

    let unsubscribeFCM: (() => void) | undefined;

    const setupNotifications = async () => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          console.warn("⚠️ Firebase Messaging not supported in this browser.");
          return;
        }

        // 🔥 STEP 1: EXPLICITLY REGISTER SERVICE WORKER
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        await navigator.serviceWorker.ready; // Wait for it to be ready
        console.log("✅ Service Worker Registered:", registration.scope);

        // 🔥 STEP 2: REQUEST PERMISSION
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          
          // 🔥 STEP 3: GET TOKEN USING THE EXPLICIT REGISTRATION
          const token = await getToken(messaging, { 
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration // Vercel fixes k liye zaroori hai
          });
          
          if (token) {
            console.log("✅ FCM Token Generated successfully!");
            await dispatch(saveDoctorFcmToken(token)).unwrap(); 
          }
        } else {
          console.warn("❌ Notification permission denied by user.");
        }

        // 🔥 STEP 4: LISTEN FOR FOREGROUND NOTIFICATIONS
        unsubscribeFCM = onMessage(messaging, (payload) => {
          console.log("🔔 Foreground Notification Received: ", payload);
          
          const newNotif = {
            id: Math.random().toString(36).substr(2, 9),
            title: payload.data?.title || payload.notification?.title || 'New Notification',
            desc: payload.data?.body || payload.notification?.body || 'You have a new update.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'info',
            patientId: payload.data?.patientId || null,
            patientName: payload.data?.patientName || null,
            modelName: payload.data?.modelName || null,
            reportId: payload.data?.reportId || null,
          };

          // Toast show karo
          toast.custom((t) => (
            <div
              className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer border-l-4 border-indigo-500`}
              onClick={() => {
                toast.dismiss(t.id);
                router.push('/doctor/dashboard'); 
              }}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <AlertCircle className="h-10 w-10 text-indigo-500 rounded-full bg-indigo-50 p-1.5" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-gray-900">{newNotif.title}</p>
                    <p className="mt-1 text-sm text-gray-500">{newNotif.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          ), { duration: 6000, position: 'top-right' });

          // LocalStorage Update
          const storageKey = `doctor_notifications_${actualDoctorId}`;
          const saved = localStorage.getItem(storageKey);
          const prevNotifs = saved ? JSON.parse(saved) : [];
          const updatedNotifs = [newNotif, ...prevNotifs];
          
          localStorage.setItem(storageKey, JSON.stringify(updatedNotifs));
          window.dispatchEvent(new Event('new_notification'));
        });

      } catch (error) {
        console.error("❌ Notification setup failed:", error);
      }
    };
    
    setupNotifications();

    return () => {
      if (unsubscribeFCM) {
        unsubscribeFCM();
      }
    };
  }, [dispatch, router, user]);

  return null; 
}