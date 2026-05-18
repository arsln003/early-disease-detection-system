"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ReusableTable from '@/components/ui/ReusableTable';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation'; // FIX: Router import kiya

// --- REDUX & APIs ---
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store/store';
import { fetchAssignedPatients, PatientRecord } from '@/lib/store/features/doctorSlice';

export default function DoctorDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter(); // FIX: Router initialize kiya
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { patients, loading, error } = useSelector((state: RootState) => state.doctor);

  const [filter, setFilter] = useState('All');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const actualDoctorId = user?.id || user?.sub || user?.doctorid;
    if (actualDoctorId) {
      dispatch(fetchAssignedPatients({ doctorId: actualDoctorId, severity: filter.toLowerCase() }));
    }
  }, [dispatch, user, filter]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // FIX: Ab yeh function seedha naye page par le jayega
  const handleViewDetails = (patient: any) => {
    const patientId = patient.id || patient.patientid;
    if (patientId) {
      // Apne folder structure ke hisaab se route set karo (e.g., /doctor/patient/123)
      router.push(`/doctor/patientdetails/${patientId}`); 
    } else {
      toast.error("Patient ID not found!");
    }
  };

  const columns = [
    { header: 'Patient Name', accessor: 'name' },
    { header: 'Age', accessor: 'age' },
    { header: 'Gender', accessor: 'gender' },
    { header: 'Severity', accessor: 'status' },
    { header: 'AI Risk Profile', accessor: 'risk' }, 
  ];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar role="doctor" isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header title="Assigned Patients" onMenuClick={() => setSidebarOpen(true)} />
        
        <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <p className="text-slate-500 font-medium">Review patients sorted by severity level</p>
                <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm opacity-0">
                    {['All', 'Critical', 'Moderate', 'Normal'].map((item) => (
                        <button
                            key={item}
                            onClick={() => setFilter(item)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${filter === item ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {loading ? (
            <div className="flex justify-center items-center py-20 h-64">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
        ) : (
            <ReusableTable 
                title={filter === 'All' ? 'All Assigned Patients' : `${filter} Patients`}
                columns={columns}
                data={patients}
                onView={handleViewDetails}
            />
        )}
      </main>
    </div>
  );
}