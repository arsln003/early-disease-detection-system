"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ReusableTable from '@/components/ui/ReusableTable';
import { Loader2, HeartPulse, BrainCircuit, Video, Users, AlertTriangle, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import ReportPreviewModal from '@/components/ui/ReportPreviewModal';

// Nayi APIs import ki hain
import { 
  getAssignedPatientsCount, 
  getAssignedCardioPatients, 
  getAssignedStrokePatients, 
  getAssignedCadicaPatients 
} from '@/services/apiService';

export default function DoctorDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const actualDoctorId = user?.id || user?.sub || user?.doctorid;

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<'Cardio' | 'Stroke' | 'Cadica'>('Cardio');
  
  // States for Data
  const [totalPatients, setTotalPatients] = useState(0);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortByRisk, setSortByRisk] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // 1. Fetch Total Patients Count
  useEffect(() => {
    if (actualDoctorId) {
      getAssignedPatientsCount(actualDoctorId)
        .then(res => setTotalPatients(res.assignedPatientsCount || 0))
        .catch(err => console.error("Count fetch error", err));
    }
  }, [actualDoctorId]);

  // 2. Fetch Data based on Active Model
  useEffect(() => {
    if (!actualDoctorId) return;
    fetchModelData();
  }, [actualDoctorId, activeModel]);

  const fetchModelData = async () => {
    setIsLoading(true);
    try {
      let rawData = [];
      let mappedData: any[] = [];

      if (activeModel === 'Cardio') {
        rawData = await getAssignedCardioPatients(actualDoctorId);
        mappedData = rawData.map((item: any) => {
          const latestReport = item.patient.reports?.[0];
          return {
            patientId: item.patient.patientid,
            name: item.patient.fullname,
            age: item.patient.age,
            date: latestReport?.uploadedat ? new Date(latestReport.uploadedat).toLocaleDateString() : 'N/A',
            riskLevel: latestReport?.aiResult?.classification || 'Pending',
            riskScore: latestReport?.aiResult?.prediction || 0, // 1 for high risk, 0 for low
            reportId: latestReport?.reportid,
            modelName: 'Cardiovascular'
          };
        });
      } 
      else if (activeModel === 'Stroke') {
        rawData = await getAssignedStrokePatients(actualDoctorId);
        mappedData = rawData.map((item: any) => {
          const latestReport = item.patient.strokeReports?.[0];
          const prediction = latestReport?.strokeResult?.prediction || 'Pending';
          // Ischemia/Hemorrhage = High Risk (score 1), No Stroke = Safe (score 0)
          const riskScore = (prediction === 'Ischemia' || prediction === 'Hemorrhage') ? 1 : 0;
          
          return {
            patientId: item.patient.patientid,
            name: item.patient.fullname,
            age: item.patient.age,
            date: latestReport?.uploadedat ? new Date(latestReport.uploadedat).toLocaleDateString() : 'N/A',
            riskLevel: prediction,
            riskScore: riskScore,
            reportId: latestReport?.strokereportid,
            modelName: 'Stroke'
          };
        });
      }
      else if (activeModel === 'Cadica') {
        rawData = await getAssignedCadicaPatients(actualDoctorId);
        mappedData = rawData.map((item: any) => {
          const latestReport = item.patient.cadicaVideoReports?.[0];
          const verdict = latestReport?.cadicaResult?.verdict || 'Pending';
          const riskScore = verdict === 'LESION' ? 1 : 0;

          return {
            patientId: item.patient.patientid,
            name: item.patient.fullname,
            age: item.patient.age,
            date: latestReport?.uploadedat ? new Date(latestReport.uploadedat).toLocaleDateString() : 'N/A',
            riskLevel: verdict,
            riskScore: riskScore,
            reportId: latestReport?.cadicavideoreportid,
            modelName: 'CADICA' // Backend ko jo naam chahiye modal k liye
          };
        });
      }

      setTableData(mappedData.filter(d => d.reportId)); // Sirf wo patients dikhao jinki report aa chuki hai
    } catch (error: any) {
      toast.error(`Error loading ${activeModel} patients`);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Sorting Logic
  const displayedData = [...tableData].sort((a, b) => {
    if (sortByRisk) {
      return b.riskScore - a.riskScore; // High risk (1) upar, Safe (0) neechay
    }
    return 0; // Default order
  });

  const handleViewDetails = (row: any) => {
    setSelectedReport(row);
    setIsModalOpen(true);
  };

  const columns = [
    { header: 'Patient Name', accessor: 'name' },
    { header: 'Age', accessor: 'age' },
    { header: 'Report Date', accessor: 'date' },
    { 
      header: 'AI Verdict / Risk', 
      accessor: (row: any) => (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          row.riskScore === 1 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {row.riskLevel}
        </span>
      )
    },
  ];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar role="doctor" isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header title="Diagnostic Command Center" onMenuClick={() => setSidebarOpen(true)} />
        
        {/* TOP STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Total Assigned Patients</p>
              <h2 className="text-3xl font-black text-slate-800">{totalPatients}</h2>
            </div>
            <div className="h-14 w-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={28} />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-md flex items-center justify-between text-white md:col-span-2">
             <div>
                <h3 className="text-xl font-bold mb-1">AI Diagnostic Workspace</h3>
                <p className="text-sm text-indigo-200">Select an AI model below to review patient reports and generate predictions.</p>
             </div>
          </div>
        </div>

        {/* MODEL SELECTOR CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button 
            onClick={() => setActiveModel('Cardio')}
            className={`p-5 rounded-2xl border text-left transition-all ${activeModel === 'Cardio' ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-200 scale-[1.02]' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
          >
            <HeartPulse size={28} className={activeModel === 'Cardio' ? 'text-white' : 'text-indigo-600'} />
            <h4 className={`font-bold mt-3 ${activeModel === 'Cardio' ? 'text-white' : 'text-slate-800'}`}>Cardiovascular (OCR)</h4>
            <p className={`text-xs mt-1 ${activeModel === 'Cardio' ? 'text-indigo-100' : 'text-slate-500'}`}>Tabular report predictions</p>
          </button>

          <button 
            onClick={() => setActiveModel('Stroke')}
            className={`p-5 rounded-2xl border text-left transition-all ${activeModel === 'Stroke' ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-200 scale-[1.02]' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
          >
            <BrainCircuit size={28} className={activeModel === 'Stroke' ? 'text-white' : 'text-indigo-600'} />
            <h4 className={`font-bold mt-3 ${activeModel === 'Stroke' ? 'text-white' : 'text-slate-800'}`}>Stroke (CT Scan)</h4>
            <p className={`text-xs mt-1 ${activeModel === 'Stroke' ? 'text-indigo-100' : 'text-slate-500'}`}>Brain hemorrhage & ischemia</p>
          </button>

          <button 
            onClick={() => setActiveModel('Cadica')}
            className={`p-5 rounded-2xl border text-left transition-all ${activeModel === 'Cadica' ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-200 scale-[1.02]' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
          >
            <Video size={28} className={activeModel === 'Cadica' ? 'text-white' : 'text-indigo-600'} />
            <h4 className={`font-bold mt-3 ${activeModel === 'Cadica' ? 'text-white' : 'text-slate-800'}`}>CADICA (Angiography)</h4>
            <p className={`text-xs mt-1 ${activeModel === 'Cadica' ? 'text-indigo-100' : 'text-slate-500'}`}>Video frame lesion analysis</p>
          </button>
        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {activeModel === 'Cardio' && <HeartPulse className="text-indigo-500" size={20}/>}
                {activeModel === 'Stroke' && <BrainCircuit className="text-indigo-500" size={20}/>}
                {activeModel === 'Cadica' && <Video className="text-indigo-500" size={20}/>}
                {activeModel} Patient Reports
             </h3>
             <button 
                onClick={() => setSortByRisk(!sortByRisk)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${sortByRisk ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
             >
                <AlertTriangle size={16} /> 
                {sortByRisk ? "Showing High Risk First" : "Sort by High Risk"}
                <ArrowUpDown size={14} className="ml-1 opacity-50" />
             </button>
          </div>

          <div className="p-1">
            {isLoading ? (
                <div className="flex justify-center items-center py-20 h-64">
                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                </div>
            ) : displayedData.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-slate-500 font-medium">No reports found for this model yet.</p>
                </div>
            ) : (
                <ReusableTable 
                    title="" // Title hidden as we have custom header above
                    columns={columns}
                    data={displayedData}
                    onView={handleViewDetails}
                />
            )}
          </div>
        </div>
        
        {/* 🚨 YAHAN HUMNE WAHI MODAL LAGA DIYA */}
        <ReportPreviewModal 
           isOpen={isModalOpen}
           onClose={() => setIsModalOpen(false)}
           reportId={selectedReport?.reportId}
           patientId={selectedReport?.patientId}
           patientName={selectedReport?.name}
           modelName={selectedReport?.modelName === 'Cardiovascular' ? 'Cardiovascular' : selectedReport?.modelName === 'Stroke' ? 'Stroke' : 'CADICA'} 
        />

      </main>
    </div>
  );
}