"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ReusableTable from '@/components/ui/ReusableTable';
import GenericFormModal from '@/components/ui/GenericFormModal';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/store/store'; 
import { fetchHistory, UploadRecord } from '@/lib/store/features/reportSlice'; 

export default function UploadHistory() {
  const dispatch = useDispatch<AppDispatch>();
  const { uploads, loading, error } = useSelector((state: RootState) => state.reports);

  const [activeTab, setActiveTab] = useState('All');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UploadRecord | null>(null);

  useEffect(() => {
    dispatch(fetchHistory());
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleViewDetails = (record: UploadRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const columns = [
    { header: 'Patient Name', accessor: 'patientName' },
    { header: 'Gender', accessor: 'gender' },
    { header: 'Upload Date', accessor: 'uploadDate' },
    { header: 'Status', accessor: 'status' },
  ];

  const filteredData = uploads.filter((u: UploadRecord) => {
    if (activeTab === 'All') return true;
    return u.status === activeTab;
  });

  // Modal Fields (Disabled for viewing only)
  const viewFields = selectedRecord ? [
    { name: 'patientName', label: 'Patient Name', type: 'text', defaultValue: selectedRecord.patientName, disabled: true },
    { name: 'gender', label: 'Gender', type: 'text', defaultValue: selectedRecord.gender, disabled: true },
    { name: 'uploadDate', label: 'Date Uploaded', type: 'text', defaultValue: selectedRecord.uploadDate, disabled: true },
    { name: 'status', label: 'Current Status', type: 'text', defaultValue: selectedRecord.status, disabled: true },
  ] : [];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar role="radiologist" isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header title="Upload History" onMenuClick={() => setSidebarOpen(true)} />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : (
          <>
            <div className="mb-8">
               <div className="inline-flex p-1.5 bg-white border border-slate-100 rounded-xl shadow-sm overflow-x-auto max-w-full">
                {['All', 'Processed', 'Pending AI'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === tab ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <ReusableTable
              title={activeTab === 'All' ? 'All Uploads' : `${activeTab} Reports`}
              columns={columns}
              data={filteredData}
              onView={handleViewDetails}
            />
          </>
        )}

        <GenericFormModal
            isOpen={isViewModalOpen}
            onClose={() => setIsViewModalOpen(false)}
            title="Report Details"
            fields={viewFields}
            onSubmit={() => setIsViewModalOpen(false)}
            submitLabel="Close"
        />
      </main>
    </div>
  );
}