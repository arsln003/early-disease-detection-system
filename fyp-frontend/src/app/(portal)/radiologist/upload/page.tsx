"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header'; 
import GenericFormModal from '@/components/ui/GenericFormModal';
import { UploadCloud, Plus, FileText, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import toast from 'react-hot-toast';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store/store'; 
// FIX: Imported all 3 Model Actions
import { uploadReport, fetchPatients, uploadCadicaVideos, uploadStrokeImage } from '@/lib/store/features/reportSlice';

export default function UploadReport() {
  const dispatch = useDispatch<AppDispatch>();
  const { patients, isPatientsLoading } = useSelector((state: RootState) => state.reports);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchPatients());
  }, [dispatch]);

  const patientOptions = patients.map((p: any) => 
    `${p.patientid || p.id} - ${p.fullname || p.name || 'Unknown'}`
  );

  const uploadFields = [
    { 
      name: 'patientSelection', 
      label: 'Select Patient', 
      type: 'select', 
      options: patientOptions.length > 0 ? patientOptions : ['No patients found'], 
      required: true 
    },
    { 
      name: 'reportType', 
      label: 'Model / Report Type', 
      type: 'select', 
      // FIX: 3 Models ke specific names
      options: ['Cardiovascular Risk (OCR)', 'Stroke CT Scan', 'CADICA Angiography'], 
      required: true 
    },
    { 
      name: 'fileAttachment', 
      label: 'Upload Source File(s)', 
      type: 'file', 
      required: true 
    },
    { 
      name: 'notes', 
      label: 'Radiologist Notes', 
      type: 'textarea', 
      placeholder: 'Add clinical observations...', 
      required: false 
    },
  ];

  // --- UPLOAD ROUTING LOGIC ---
  const handleUploadSubmit = async (data: any) => {
    const selectedPatientStr = data.patientSelection;
    if (selectedPatientStr === 'No patients found') {
      toast.error("Please select a valid patient.");
      return;
    }
    
    const patientId = selectedPatientStr.split(' - ')[0];
    const toastId = toast.loading(`Processing ${data.reportType}...`);

    try {
      // ----------------------------------------------------
      // MODEL 1: CADICA (Multiple Videos)
      // ----------------------------------------------------
      if (data.reportType === 'CADICA Angiography') {
        const formData = new FormData();
        if (data.notes) formData.append('comment', data.notes);

        const files = data.fileAttachment instanceof FileList ? Array.from(data.fileAttachment) : [data.fileAttachment];
        if (files.length === 0 || !files[0]) {
          toast.error("Please select at least one video file.", { id: toastId }); return;
        }

        files.forEach(f => formData.append('files', f as Blob));
        
        await dispatch(uploadCadicaVideos({ patientId: Number(patientId), formData })).unwrap();
        toast.success("CADICA Angiography Uploaded Successfully! 🎥", { id: toastId });
      } 
      
      // ----------------------------------------------------
      // MODEL 2: STROKE CT SCAN (Single Image)
      // ----------------------------------------------------
      else if (data.reportType === 'Stroke CT Scan') {
        const formData = new FormData();
        if (data.notes) formData.append('comment', data.notes);

        const file = data.fileAttachment instanceof FileList ? data.fileAttachment[0] : data.fileAttachment;
        if (!file) {
          toast.error("Please select a CT Scan Image.", { id: toastId }); return;
        }
        
        formData.append('file', file);
        
        await dispatch(uploadStrokeImage({ patientId: Number(patientId), formData })).unwrap();
        toast.success("Stroke CT Scan Uploaded Successfully! 🧠", { id: toastId });
      }

      // ----------------------------------------------------
      // MODEL 3: CARDIOVASCULAR OCR (Single PDF/Doc)
      // ----------------------------------------------------
      else if (data.reportType === 'Cardiovascular Risk (OCR)') {
        const formData = new FormData();
        formData.append('patientId', patientId); 
        if (data.notes) formData.append('comment', data.notes);

        const file = data.fileAttachment instanceof FileList ? data.fileAttachment[0] : data.fileAttachment;
        if (!file) {
          toast.error("Please select a PDF document.", { id: toastId }); return;
        }
        
        formData.append('file', file);

        await dispatch(uploadReport(formData)).unwrap();
        toast.success("Cardiovascular OCR Report Uploaded! 🫀", { id: toastId });
      }

      setIsUploadModalOpen(false);

    } catch (error: any) {
      // toast.error(error?.message || error || "Upload failed. Please try again.", { id: toastId });
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      
      // 1. Toast mein backend ka asli error dikhao
      toast.error(errorMessage);
      
      // 2. ERROR KO WAPAS THROW KARO! 
      // Is line ki wajah se GenericFormModal ko pata chalega ke error aaya hai 
      // aur wo laal dabba (banner) form ke andar show karega.
      throw new Error(errorMessage);
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar role="radiologist" isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header title="Upload Center" onMenuClick={() => setSidebarOpen(true)} />
        
        <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-slate-100 text-center transition-all duration-300 hover:shadow-md relative overflow-hidden">
                
                {/* Decorative UI element */}
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <BrainCircuit size={160} />
                </div>

                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 text-indigo-600 mb-6 shadow-sm shadow-indigo-100 relative z-10">
                    <UploadCloud size={40} />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-800 mb-3 relative z-10">Upload AI Diagnostic Data</h2>
                <p className="text-slate-500 max-w-lg mx-auto mb-10 leading-relaxed relative z-10">
                    Select an assigned patient and route the file to the appropriate AI Diagnostic Model. 
                    <br/><span className="font-semibold text-slate-600 text-xs mt-2 inline-block bg-slate-100 px-3 py-1 rounded-full">Supports OCR, CT Scans & Angiography</span>
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                    <button 
                        onClick={() => setIsUploadModalOpen(true)}
                        disabled={isPatientsLoading}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95"
                    >
                        {isPatientsLoading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                        {isPatientsLoading ? 'Loading Data...' : 'Start New Upload'}
                    </button>
                </div>
            </div>
        </div>

        <GenericFormModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            title="Upload New Data"
            fields={uploadFields}
            onSubmit={handleUploadSubmit}
            submitLabel="Run AI Model"
        />

      </main>
    </div>
  );
}