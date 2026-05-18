"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store/store';
import { 
  Activity, BrainCircuit, HeartPulse, Video, ArrowLeft, 
  FileText, AlertCircle, CheckCircle2, Loader2, ClipboardList, 
  Image as ImageIcon, Search, Layers, Film, Percent, Calendar, ShieldCheck
} from 'lucide-react';

import { 
  fetchAssignedPatients, 
  fetchStrokePredictionThunk, 
  generateCadicaPredictionThunk,
  fetchCadicaPredictionThunk,
  fetchPatientOcrHistoryThunk,
  fetchPatientStrokeHistoryThunk,
  fetchPatientCadicaHistoryThunk
} from '@/lib/store/features/doctorSlice';
import { getCardioReportDetails } from '@/services/apiService'; // 🔥 Changed to Cardio Report API
import toast from 'react-hot-toast';

export default function PatientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const patientId = Number(params.id);
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ocr');

  const [selectedOcrId, setSelectedOcrId] = useState<number | null>(null);
  const [selectedStrokeId, setSelectedStrokeId] = useState<number | null>(null);
  const [selectedCadicaId, setSelectedCadicaId] = useState<number | null>(null);

  const [ocrData, setOcrData] = useState<any>(null); 
  const [isOcrLoading, setIsOcrLoading] = useState(false); 

  const [strokeData, setStrokeData] = useState<any>(null);
  const [isStrokeLoading, setIsStrokeLoading] = useState(false);
  
  const [cadicaData, setCadicaData] = useState<any>(null);
  const [isCadicaLoading, setIsCadicaLoading] = useState(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const { patients, loading, ocrHistory, strokeHistory, cadicaHistory } = useSelector((state: RootState) => state.doctor);

  useEffect(() => {
    if (patients.length === 0 && user) {
      const actualDoctorId = user?.id || user?.sub || user?.doctorid;
      if (actualDoctorId) {
        dispatch(fetchAssignedPatients({ doctorId: actualDoctorId, severity: 'all' }));
      }
    }
  }, [dispatch, patients.length, user]);

  const patient = patients.find(p => p.id === patientId || (p as any).patientid === patientId);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // ==========================================
  // 1. OCR DATA LOGIC 
  // ==========================================
  useEffect(() => {
    if (activeTab === 'ocr' && patientId) {
      dispatch(fetchPatientOcrHistoryThunk(patientId));
    }
  }, [activeTab, patientId, dispatch]);

  useEffect(() => {
    if (activeTab === 'ocr' && ocrHistory?.length > 0 && !selectedOcrId) {
      setSelectedOcrId(ocrHistory[0].reportid);
    }
  }, [activeTab, ocrHistory, selectedOcrId]);

  useEffect(() => {
    const fetchOcr = async () => {
      if (selectedOcrId) {
        setIsOcrLoading(true);
        try {
          // 🔥 Nayi API call jo NLP data bhi layegi
          const response = await getCardioReportDetails(selectedOcrId);
          setOcrData(response);
        } catch (error: any) {
          toast.error(error?.message || "Failed to load OCR data");
        } finally {
          setIsOcrLoading(false);
        }
      }
    };
    if (activeTab === 'ocr' && selectedOcrId) fetchOcr();
  }, [activeTab, selectedOcrId]);

  const activeOcrReport = ocrHistory?.find(r => r.reportid === selectedOcrId);
  const aiDetails = ocrData?.aiResult || activeOcrReport?.aiResult;
  const displayFeatures = ocrData?.feature || activeOcrReport?.feature;
  const nlpDetails = ocrData?.cardioNlpResult; // 🔥 NLP Data Extraction

  const displayPrediction = aiDetails?.prediction;
  const ocrConfidenceScore = aiDetails?.probability;
  const riskText = aiDetails?.classification ? aiDetails.classification.toUpperCase() : 'NO DATA';

  // ==========================================
  // 2. STROKE DATA LOGIC
  // ==========================================
  useEffect(() => {
    if (activeTab === 'stroke' && patientId) {
      dispatch(fetchPatientStrokeHistoryThunk(patientId));
    }
  }, [activeTab, patientId, dispatch]);

  useEffect(() => {
    if (activeTab === 'stroke' && strokeHistory?.length > 0 && !selectedStrokeId) {
      setSelectedStrokeId(strokeHistory[0].strokereportid); 
    }
  }, [activeTab, strokeHistory, selectedStrokeId]);

  useEffect(() => {
    const fetchStroke = async () => {
      if (selectedStrokeId) {
        setIsStrokeLoading(true);
        try {
          const response = await dispatch(fetchStrokePredictionThunk(selectedStrokeId)).unwrap();
          setStrokeData(response);
        } catch (error: any) {
          toast.error(error || "Failed to load Stroke data");
        } finally {
          setIsStrokeLoading(false);
        }
      }
    };
    if (activeTab === 'stroke' && selectedStrokeId) fetchStroke();
  }, [activeTab, selectedStrokeId, dispatch]);

  // ==========================================
  // 3. CADICA DATA LOGIC
  // ==========================================
  useEffect(() => {
    if (activeTab === 'cadica' && patientId) {
      dispatch(fetchPatientCadicaHistoryThunk(patientId));
    }
  }, [activeTab, patientId, dispatch]);

  useEffect(() => {
    if (activeTab === 'cadica' && cadicaHistory?.length > 0 && !selectedCadicaId) {
      setSelectedCadicaId(cadicaHistory[0].cadicavideoreportid); 
    }
  }, [activeTab, cadicaHistory, selectedCadicaId]);

  useEffect(() => {
    const processAndFetchCadica = async () => {
      if (selectedCadicaId) {
        setIsCadicaLoading(true);
        try {
          await dispatch(generateCadicaPredictionThunk(selectedCadicaId)).unwrap();
          const response = await dispatch(fetchCadicaPredictionThunk(selectedCadicaId)).unwrap();
          setCadicaData(response);
        } catch (error: any) {
          toast.error(error?.message || error || "Failed to process CADICA data");
        } finally {
          setIsCadicaLoading(false);
        }
      }
    };
    if (activeTab === 'cadica' && selectedCadicaId) processAndFetchCadica();
  }, [activeTab, selectedCadicaId, dispatch]);

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500 flex-col gap-3">
        <Loader2 className="animate-spin text-indigo-600" size={48} /> 
        <p className="font-medium">Loading patient data...</p>
      </div>
    );
  }

  const strokeResult = strokeData?.strokeResult || strokeData?.modelResult;
  const isStrokeDetected = strokeResult?.prediction && strokeResult.prediction !== "No Stroke";
  const strokeColorText = isStrokeDetected ? "text-rose-600" : "text-emerald-600";
  const strokeColorBg = isStrokeDetected ? "bg-rose-50" : "bg-emerald-50";
  const strokeColorBorder = isStrokeDetected ? "border-rose-200" : "border-emerald-200";
  const strokeColorBar = isStrokeDetected ? "bg-rose-500" : "bg-emerald-500";

  const cadicaResult = cadicaData?.cadicaResult || cadicaData?.modelResult;
  const isLesionDetected = cadicaResult?.verdict === "LESION";
  const cadicaColorText = isLesionDetected ? "text-rose-600" : "text-emerald-600";
  const cadicaColorBg = isLesionDetected ? "bg-rose-50" : "bg-emerald-50";
  const cadicaColorBorder = isLesionDetected ? "border-rose-200" : "border-emerald-200";
  const cadicaColorBar = isLesionDetected ? "bg-rose-500" : "bg-emerald-500";
  
  const cadicaVideosArray = cadicaResult?.gradcamImages || cadicaResult?.per_video || cadicaResult?.perVideo || [];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar role="doctor" isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header title="Patient Diagnostic Profile" onMenuClick={() => setSidebarOpen(true)} />
        
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 capitalize">{patient.name || (patient as any).fullname}</h1>
            <p className="text-slate-500 text-sm font-medium">Patient ID: #{patient.id} • {patient.age} years old • {patient.gender}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm w-fit">
          <button onClick={() => setActiveTab('ocr')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'ocr' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
            <HeartPulse size={18} /> Cardiovascular (OCR)
          </button>
          <button onClick={() => setActiveTab('stroke')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'stroke' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
            <BrainCircuit size={18} /> Stroke (CT Scan)
          </button>
          <button onClick={() => setActiveTab('cadica')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'cadica' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
            <Video size={18} /> CADICA (Angiography)
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 min-h-[500px]">
            
          {/* ========================================================= */}
          {/* TAB 1: OCR CONTENT */}
          {/* ========================================================= */}
          {activeTab === 'ocr' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Activity className="text-indigo-500" /> Cardiovascular Risk Analysis
                 </h3>
                 
                 {ocrHistory && ocrHistory.length > 0 && (
                   <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                      <Calendar size={16} className="text-slate-400" />
                      <select 
                        value={selectedOcrId || ''} 
                        onChange={(e) => setSelectedOcrId(Number(e.target.value))}
                        className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer w-full max-w-[200px]"
                      >
                        {ocrHistory.map((report: any) => (
                          <option key={report.reportid} value={report.reportid}>
                            {formatDate(report.uploadedat)} {report.filename ? `- ${report.filename.substring(0, 15)}...` : ''}
                          </option>
                        ))}
                      </select>
                   </div>
                 )}
               </div>
               
               {isOcrLoading ? (
                 <div className="flex flex-col items-center justify-center p-12 gap-4">
                   <Loader2 className="animate-spin text-indigo-600" size={40} />
                   <p className="text-slate-500 font-medium">Fetching advanced insights...</p>
                 </div>
               ) : !activeOcrReport ? (
                 <div className="p-10 border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-slate-500">No OCR report uploaded for this patient yet.</p>
                 </div>
               ) : (
                 <div className="space-y-8">
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-5 space-y-6">
                          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><FileText size={18} /> Document Details</h4>
                            <div className="text-sm space-y-3">
                               <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">File Name</span><span className="font-medium text-indigo-600 break-all">{activeOcrReport.filename}</span></div>
                              <div>
                                <span className="text-slate-500 block mb-1">Radiologist Comments:</span>
                                <p className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 italic">{activeOcrReport.comment || 'No comments available.'}</p>
                              </div>
                            </div>
                          </div>
                          
                          {displayFeatures && (
                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-5">
                              <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><HeartPulse size={18} className="text-indigo-500" /> Key Vitals Extracted</h4>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center"><span className="block text-slate-500 text-xs mb-1">Systolic BP</span><span className="font-bold text-slate-800 text-lg">{displayFeatures.ap_hi || 'N/A'}</span></div>
                                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center"><span className="block text-slate-500 text-xs mb-1">Diastolic BP</span><span className="font-bold text-slate-800 text-lg">{displayFeatures.ap_lo || 'N/A'}</span></div>
                                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center"><span className="block text-slate-500 text-xs mb-1">Cholesterol</span><span className="font-bold text-slate-800 text-lg">{displayFeatures.cholesterol || 'N/A'}</span></div>
                                <div className="bg-white p-3 rounded-lg border border-slate-200 text-center"><span className="block text-slate-500 text-xs mb-1">Glucose</span><span className="font-bold text-slate-800 text-lg">{displayFeatures.gluc || 'N/A'}</span></div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="lg:col-span-7 space-y-6">
                          <div className={`rounded-xl p-6 border ${displayPrediction === 1 ? 'bg-red-50 border-red-200' : displayPrediction === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                            <h4 className={`font-bold mb-2 flex items-center gap-2 ${displayPrediction === 1 ? 'text-red-800' : displayPrediction === 0 ? 'text-emerald-800' : 'text-slate-700'}`}>
                              {displayPrediction === 1 ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />} Overall AI Risk Classification
                            </h4>
                            <div className="mt-4 flex items-center justify-between">
                              <span className="text-sm font-medium opacity-80">Verdict:</span>
                              <span className={`text-3xl font-black tracking-tight ${displayPrediction === 1 ? 'text-red-600' : displayPrediction === 0 ? 'text-emerald-600' : 'text-slate-500'}`}>{riskText}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                <div className="flex justify-between items-center text-sm mb-4">
                                    <span className="text-slate-600 font-semibold flex items-center gap-1.5"><BrainCircuit size={16}/> AI Confidence</span>
                                    <span className="font-bold text-slate-800 text-lg">{ocrConfidenceScore !== undefined ? `${(ocrConfidenceScore * 100).toFixed(1)}%` : 'N/A'}</span>
                                </div>
                                {ocrConfidenceScore !== undefined && (
                                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                                      <div className={`h-2 rounded-full ${displayPrediction === 1 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${ocrConfidenceScore * 100}%` }}></div>
                                  </div>
                                )}
                              </div>
                              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-center">
                                 <span className="text-slate-600 font-semibold flex items-center gap-1.5 mb-2"><ClipboardList size={16}/> AI Remarks</span>
                                 <p className={`text-sm font-medium leading-relaxed ${displayPrediction === 1 ? 'text-red-700' : 'text-emerald-700'}`}>{aiDetails?.remarks || "No additional remarks generated."}</p>
                              </div>
                          </div>
                        </div>
                     </div>

                     {/* 🔥 NEW: ADVANCED NLP ANALYSIS SECTION 🔥 */}
                     {nlpDetails && (
                        <div className="mt-8 border-t border-slate-200 pt-8 animate-in fade-in slide-in-from-bottom-4">
                           <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                             <BrainCircuit className="text-indigo-600" /> Advanced NLP Diagnostics Analysis
                           </h3>
                           
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                              <div className="md:col-span-2 bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                                  <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><ClipboardList size={18}/> Clinical Summary</h4>
                                  <p className="text-indigo-800/80 text-sm leading-relaxed">{nlpDetails.clinicalSummary}</p>
                              </div>
                              
                              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
                                  <div>
                                      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">CVD Risk (Framingham)</span>
                                      <div className="flex items-end gap-2">
                                          <span className="text-2xl font-black text-slate-800">{nlpDetails.framinghamCvdScore}%</span>
                                          <span className={`text-sm font-bold mb-1 ${nlpDetails.cvdRiskLevel === 'High' ? 'text-rose-600' : nlpDetails.cvdRiskLevel === 'Intermediate' ? 'text-amber-500' : 'text-emerald-600'}`}>
                                            ({nlpDetails.cvdRiskLevel})
                                          </span>
                                      </div>
                                  </div>
                                  <div className="w-full h-px bg-slate-100"></div>
                                  <div>
                                      <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">Stroke Risk Score</span>
                                      <div className="flex items-end gap-2">
                                          <span className="text-2xl font-black text-slate-800">{nlpDetails.framinghamStrokeScore}%</span>
                                          <span className={`text-sm font-bold mb-1 ${nlpDetails.strokeRiskLevel === 'High' ? 'text-rose-600' : nlpDetails.strokeRiskLevel === 'Intermediate' ? 'text-amber-500' : 'text-emerald-600'}`}>
                                            ({nlpDetails.strokeRiskLevel})
                                          </span>
                                      </div>
                                  </div>
                              </div>
                           </div>

                           {nlpDetails.verifiedResults && nlpDetails.verifiedResults.length > 0 && (
                             <div>
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600"/> Verified Clinical Indicators</h4>
                                <div className="grid grid-cols-1 gap-4">
                                   {nlpDetails.verifiedResults.map((result: any, index: number) => (
                                      <div key={index} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                         <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                            <h5 className="font-bold text-slate-800 text-base">{result.disease}</h5>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.llm_validation === 'VALID' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                              {result.llm_validation}
                                            </span>
                                         </div>
                                         <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-100 leading-relaxed mb-3">
                                            <span className="font-semibold text-slate-900 block mb-1">AI Explanation:</span>
                                            {result.final_explanation}
                                         </div>
                                         {result.retrieved_evidence && (
                                            <p className="text-xs text-slate-500 italic flex gap-1.5 mt-2">
                                               <span className="font-semibold not-italic text-slate-600">Evidence:</span> {result.retrieved_evidence}
                                            </p>
                                         )}
                                      </div>
                                   ))}
                                </div>
                             </div>
                           )}
                        </div>
                     )}
                 </div>
               )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: STROKE CONTENT (UNCHANGED) */}
          {/* ========================================================= */}
          {activeTab === 'stroke' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <BrainCircuit className="text-indigo-500" /> Stroke CT Scan Analysis
                 </h3>
                 
                 {strokeHistory && strokeHistory.length > 0 && (
                   <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                      <Calendar size={16} className="text-slate-400" />
                      <select 
                        value={selectedStrokeId || ''} 
                        onChange={(e) => setSelectedStrokeId(Number(e.target.value))}
                        className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer w-full max-w-[200px]"
                      >
                        {strokeHistory.map((report: any) => (
                          <option key={report.strokereportid} value={report.strokereportid}>
                            {formatDate(report.uploadedat)} {report.filename ? `- ${report.filename.substring(0, 15)}...` : ''}
                          </option>
                        ))}
                      </select>
                   </div>
                 )}
               </div>
               
               {isStrokeLoading ? (
                 <div className="flex flex-col items-center justify-center p-12 gap-4">
                   <Loader2 className="animate-spin text-indigo-600" size={40} />
                   <p className="text-slate-500 font-medium animate-pulse">Fetching AI Prediction & Images...</p>
                 </div>
               ) : !strokeResult ? (
                 <div className="p-10 border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-slate-500">No Stroke CT Scan report found for this patient.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-6">
                        <div className={`${strokeColorBg} border ${strokeColorBorder} p-6 rounded-2xl`}>
                           <h4 className="text-slate-800 font-bold mb-2 flex items-center gap-2">
                             {isStrokeDetected ? <AlertCircle className="text-rose-600"/> : <CheckCircle2 className="text-emerald-600"/>}
                             AI Detection Result
                           </h4>
                           <p className={`text-3xl font-black ${strokeColorText} tracking-tight capitalize`}>
                             {strokeResult.prediction}
                           </p>
                           <div className="mt-6 pt-5 border-t border-black/5">
                               <div className="flex justify-between text-sm mb-2 font-bold text-slate-700">
                                   <span>Overall Confidence</span>
                                   <span>{strokeResult.confidence ? (strokeResult.confidence * 100).toFixed(2): 0}%</span>
                               </div>
                               <div className="w-full bg-slate-200/60 rounded-full h-2.5">
                                  <div className={`${strokeColorBar} h-2.5 rounded-full`} style={{ width: `${(strokeResult.confidence || 0) * 100}%` }}></div>
                               </div>
                           </div>
                        </div>

                        {strokeResult.probabilities && (
                          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Search size={16}/> Class Probabilities</h4>
                            <div className="space-y-4">
                              {Object.entries(strokeResult.probabilities).map(([key, val]: any) => {
                                const percentage = (val * 100).toFixed(2);
                                const isDominant = strokeResult.prediction === key;
                                return (
                                  <div key={key}>
                                    <div className="flex justify-between text-xs font-medium mb-1.5 text-slate-600">
                                      <span className={isDominant ? 'font-bold text-slate-900' : ''}>{key}</span>
                                      <span className={isDominant ? 'font-bold text-slate-900' : ''}>{percentage}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                      <div className={`h-1.5 rounded-full ${key === 'No Stroke' ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${val * 100}%` }}></div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="lg:col-span-7 bg-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center border-[6px] border-slate-800 shadow-2xl overflow-hidden relative min-h-[400px]">
                        {strokeResult.resultImageUrl ? (
                          <div className="w-full h-full flex flex-col items-center gap-4">
                            {strokeResult.overlayImageUrl ? (
                              <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="text-center">
                                  <p className="text-slate-400 text-xs font-bold uppercase mb-2">Original / Marked</p>
                                  <img src={strokeResult.resultImageUrl} alt="CT Scan Original" className="w-full rounded-lg object-contain bg-black" />
                                </div>
                                <div className="text-center">
                                  <p className="text-slate-400 text-xs font-bold uppercase mb-2">Heatmap Overlay</p>
                                  <img src={strokeResult.overlayImageUrl} alt="CT Scan Overlay" className="w-full rounded-lg object-contain bg-black" />
                                </div>
                              </div>
                            ) : (
                              <img src={strokeResult.resultImageUrl} alt="CT Scan Analysis" className="max-h-[400px] rounded-lg object-contain" />
                            )}
                          </div>
                        ) : (
                            <div className="text-slate-500 flex flex-col items-center">
                                <ImageIcon size={48} className="mb-3 opacity-30" />
                                <p>No processed image returned from AI</p>
                            </div>
                        )}
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: CADICA CONTENT (UNCHANGED) */}
          {/* ========================================================= */}
          {activeTab === 'cadica' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Video className="text-indigo-500" /> Angiography Scan Analysis
                  </h3>
                  
                  {cadicaHistory && cadicaHistory.length > 0 && (
                   <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                      <Calendar size={16} className="text-slate-400" />
                      <select 
                        value={selectedCadicaId || ''} 
                        onChange={(e) => setSelectedCadicaId(Number(e.target.value))}
                        className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer w-full max-w-[200px]"
                      >
                        {cadicaHistory.map((report: any) => (
                          <option key={report.cadicavideoreportid} value={report.cadicavideoreportid}>
                            {formatDate(report.uploadedat)}
                          </option>
                        ))}
                      </select>
                   </div>
                 )}
               </div>
               
               {isCadicaLoading ? (
                 <div className="flex flex-col items-center justify-center p-12 gap-4">
                   <Loader2 className="animate-spin text-indigo-600" size={40} />
                   <p className="text-slate-500 font-medium animate-pulse">Running CADICA AI Model. This may take a while...</p>
                 </div>
               ) : !cadicaResult ? (
                 <div className="p-10 border-2 border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-slate-500">No CADICA Angiography videos found for this patient.</p>
                 </div>
               ) : (
                 <div className="space-y-8">
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-5 space-y-6">
                            <div className={`${cadicaColorBg} border ${cadicaColorBorder} p-6 rounded-2xl`}>
                               <h4 className="text-slate-800 font-bold mb-2 flex items-center gap-2">
                                 {isLesionDetected ? <AlertCircle className="text-rose-600"/> : <CheckCircle2 className="text-emerald-600"/>}
                                 AI Evaluation Verdict
                               </h4>
                               <p className={`text-3xl font-black ${cadicaColorText} tracking-tight uppercase`}>{cadicaResult.verdict}</p>
                               <div className="mt-6 pt-5 border-t border-black/5">
                                   <div className="flex justify-between text-sm mb-2 font-bold text-slate-700">
                                       <span>Overall Model Confidence</span>
                                       <span>{cadicaResult.confidence ? (cadicaResult.confidence * 100).toFixed(1) : 0}%</span>
                                   </div>
                                   <div className="w-full bg-slate-200/60 rounded-full h-2.5">
                                      <div className={`${cadicaColorBar} h-2.5 rounded-full`} style={{ width: `${(cadicaResult.confidence || 0) * 100}%` }}></div>
                                   </div>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                               <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                  <div className="text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider flex items-center gap-1.5"><Film size={14}/> Videos Processed</div>
                                  <div className="text-2xl font-bold text-slate-800">{cadicaResult.videosProcessed || cadicaResult.videos_processed || 0}</div>
                               </div>
                               <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                  <div className="text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider flex items-center gap-1.5"><AlertCircle size={14} className="text-amber-500"/> Suspicious Video</div>
                                  <div className="text-xl font-bold text-slate-800 truncate">{cadicaResult.mostSuspiciousVideo || cadicaResult.most_suspicious_video || 'N/A'}</div>
                               </div>
                            </div>
                        </div>

                        <div className="lg:col-span-7 bg-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center border-[6px] border-slate-800 shadow-2xl overflow-hidden relative min-h-[300px]">
                            {cadicaResult.summaryImageUrl || cadicaResult.summary_image_url ? (
                                <img 
                                   src={cadicaResult.summaryImageUrl || cadicaResult.summary_image_url} 
                                   alt="Angiography Summary" 
                                   className="max-h-[350px] w-full rounded-lg object-contain bg-black"
                                />
                            ) : (
                                <div className="text-slate-500 flex flex-col items-center">
                                    <ImageIcon size={48} className="mb-3 opacity-30" />
                                    <p>No summary image available</p>
                                </div>
                            )}
                        </div>
                     </div>

                     {cadicaVideosArray.length > 0 && (
                       <div className="mt-8 border-t border-slate-200 pt-8">
                         <h4 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                           <Layers className="text-indigo-600" /> Frame-by-Frame Video Analysis
                         </h4>
                         
                         <div className="flex flex-col gap-10">
                            {cadicaVideosArray.map((vid: any, idx: number) => {
                               const isVidLesion = vid.prediction === "LESION";
                               const prob = vid.probability ? (vid.probability * 100).toFixed(1) : '0.0';
                               const vImgUrl = vid.gradcamImgUrl || vid.gradcam_img_url;

                               return (
                                 <div key={idx} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-md flex flex-col transition-all duration-300 hover:shadow-lg">
                                    <div className="h-64 sm:h-[400px] bg-slate-950 relative w-full p-4 flex items-center justify-center">
                                       {vImgUrl ? (
                                         <img src={vImgUrl} alt={vid.video} className="w-full h-full object-contain" />
                                       ) : (
                                         <div className="flex flex-col items-center justify-center text-slate-500">
                                            <ImageIcon size={48} className="mb-2 opacity-50" />
                                            <p className="text-sm">Image not available</p>
                                         </div>
                                       )}
                                    </div>
                                    <div className="p-6 sm:p-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                       <div className="flex items-center gap-4">
                                          <span className={`text-lg font-black px-5 py-2.5 rounded-xl border ${isVidLesion ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                            {vid.prediction}
                                          </span>
                                          <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5 bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200">
                                            <Percent size={16} className="text-indigo-500"/> AI Weight: {vid.weight ? vid.weight.toFixed(3) : 'N/A'}
                                          </span>
                                       </div>
                                       <div className="w-full sm:w-1/3">
                                           <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                                               <span>Lesion Probability</span>
                                               <span className={isVidLesion ? 'text-rose-600' : 'text-emerald-600'}>{prob}%</span>
                                           </div>
                                           <div className="w-full bg-slate-100 rounded-full h-2.5 shadow-inner overflow-hidden">
                                              <div className={`h-2.5 rounded-full ${isVidLesion ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${prob}%` }}></div>
                                           </div>
                                       </div>
                                    </div>
                                 </div>
                               )
                            })}
                         </div>
                       </div>
                     )}
                 </div>
               )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}