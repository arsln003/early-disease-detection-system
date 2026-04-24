import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// 🔁 Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyArnfs7IqSpxMPT04xEbqtReoqp7g0fY6s",
  authDomain: "early-disease-detection-system.firebaseapp.com",
  projectId: "early-disease-detection-system",
  storageBucket: "early-disease-detection-system.firebasestorage.app",
  messagingSenderId: "48076998071",
  appId: "1:48076998071:web:964f7a88fe136bd36a9432",

};
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

function App() {
  const [fcmToken, setFcmToken] = useState('');
  const [doctorJwt, setDoctorJwt] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMzLCJlbWFpbCI6ImFyc2FsYW5AZ21haWwuY29tIiwicm9sZSI6ImRvY3RvciIsImlhdCI6MTc3Njk4MzYzNSwiZXhwIjoxNzc3MDcwMDM1fQ.TiKrbHBHodHGDgeUqKsXSvNYoMPsFoUenQf52drDOLo');       // 👈 paste doctor token here
  const [radiologistJwt, setRadiologistJwt] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjI4LCJlbWFpbCI6ImFyc2FsYW5AZ21haWwuY29tIiwicm9sZSI6InJhZGlvbG9naXN0IiwiaWF0IjoxNzc2OTgzNjAzLCJleHAiOjE3NzcwNzAwMDN9.2WE5DCsNISHDLlTW2nfZk-fYyVM9bGoK6peXiPlqyGw'); // 👈 paste radiologist token here
  const [reportId, setReportId] = useState('');
  const [backendUrl, setBackendUrl] = useState('http://localhost:5000');
  const [status, setStatus] = useState('');

  // Request FCM token on load
  useEffect(() => {
    const initFcm = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setStatus('❌ Notification permission denied');
          return;
        }
        const token = await getToken(messaging, {
          vapidKey: 'BMcLk-mqmx9GVNGCX1U3QgUVbGtIvSe2Msgv4c9yCfhQ_fULVtNvszvtDlmYJAeaYLTv5079lbhx6tIJowkgpAY', // 🔁 Replace with your VAPID key
        });
        if (token) {
          setFcmToken(token);
          setStatus('✅ FCM token ready');
        } else {
          setStatus('❌ No FCM token');
        }
      } catch (err) {
        setStatus(`❌ FCM error: ${err.message}`);
      }
    };
    initFcm();
  }, []);

  // 1. Save FCM token to backend (DOCTOR endpoint)
  const saveToken = async () => {
    if (!fcmToken) return setStatus('❌ No FCM token');
    if (!doctorJwt) return setStatus('❌ Paste a Doctor JWT first');

    try {
      const res = await fetch(`${backendUrl}/doctors/fcm-token`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${doctorJwt}`,
        },
        body: JSON.stringify({ fcmtoken: fcmToken }),
      });
       const text = await res.text(); 
console.log('Raw response:', text);

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setStatus(`✅ Token saved: ${data.message}`);
    } catch (err) {
      setStatus(`❌ Save error: ${err.message}`);
    }
  };

  // 2. Send report (RADIOLOGIST endpoint)
  const sendReport = async () => {
    if (!reportId) return setStatus('❌ Enter report ID');
    if (!radiologistJwt) return setStatus('❌ Paste a Radiologist JWT first');

    try {
      const res = await fetch(`${backendUrl}/radiologists/send-report/${reportId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${radiologistJwt}`,
        },
        body: JSON.stringify({ comment: 'Test from React FCM tester' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setStatus(`✅ Report sent: ${data.message || JSON.stringify(data)}`);
    } catch (err) {
      setStatus(`❌ Send error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '700px', margin: 'auto' }}>
      <h1>📱 FCM Test Panel</h1>

      <div style={{ background: '#eee', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <label>Backend URL</label>
        <input type="text" value={backendUrl} onChange={e => setBackendUrl(e.target.value)} style={{ width: '100%', marginBottom: '1rem' }} />
      </div>

      <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h3>📲 Step 1 – Get FCM Token</h3>
        <p>{status}</p>
        {fcmToken && <textarea readOnly value={fcmToken} rows={2} style={{ width: '100%' }} />}
      </div>

      <div style={{ background: '#fff3e0', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h3>👨‍⚕️ Step 2 – Save token as DOCTOR</h3>
        <label>Doctor JWT (from Postman login):</label>
        <input type="text" value={doctorJwt} onChange={e => setDoctorJwt(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem' }} placeholder="eyJhbGciOiJIUzI1NiIs..." />
        <button onClick={saveToken} disabled={!fcmToken || !doctorJwt}>Save FCM Token to Doctor</button>
      </div>

      <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px' }}>
        <h3>📤 Step 3 – Send report as RADIOLOGIST</h3>
        <label>Radiologist JWT (from Postman login):</label>
        <input type="text" value={radiologistJwt} onChange={e => setRadiologistJwt(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem' }} placeholder="eyJhbGciOiJIUzI1NiIs..." />
        <label>Report ID:</label>
        <input type="number" value={reportId} onChange={e => setReportId(e.target.value)} style={{ marginRight: '1rem', padding: '0.5rem' }} />
        <button onClick={sendReport} disabled={!reportId || !radiologistJwt}>Send Report</button>
      </div>
    </div>
  );
}

export default App;