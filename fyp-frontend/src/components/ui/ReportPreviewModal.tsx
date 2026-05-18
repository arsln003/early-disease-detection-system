"use client";
import React, { useEffect, useState } from 'react';
import { X, Activity, BrainCircuit, HeartPulse, ClipboardList, AlertCircle, CheckCircle2, Loader2, Search, ImageIcon, Calendar, ShieldCheck, Video } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/lib/store/store';
import toast from 'react-hot-toast';

import { 
  getDoctorPatientOcrHistory, 
  doctorGetPrediction, 
  getDoctorPatientStrokeHistory, 
  doctorGetStrokePrediction,
  doctorGetCadicaPrediction,
  getCardioReportDetails // 🔥 Direct Single Call
} from '@/services/apiService';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string | null; 
  patientId: string | null;
  patientName: string | null;
  modelName: string | null; 
}

export default function ReportPreviewModal({ isOpen, onClose, reportId, patientId, patientName, modelName }: ReportPreviewModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

  const extractReports = (rawResponse: any, arrayKey: string) => {
    if (!rawResponse) return [];
    if (Array.isArray(rawResponse)) {
      if (rawResponse[0]?.patient && rawResponse[0].patient[arrayKey]) {
        return rawResponse[0].patient[arrayKey]; 
      }
      return rawResponse; 
    }
    return rawResponse[arrayKey] || rawResponse.reports || rawResponse.data || [];
  };

  useEffect(() => {
    if (isOpen && patientId && modelName) {
      if (reportId) {
        setSelectedHistoryId(Number(reportId)); // Directly set ID from notification
      }
      fetchPatientHistory();
    }
  }, [isOpen, patientId, modelName, reportId]);

  const fetchPatientHistory = async () => {
    setIsLoading(true);
    setHistoryList([]);
    setData(null);

    try {
      if (modelName === 'Cardiovascular') {
        const rawResponse = await getDoctorPatientOcrHistory(Number(patientId));
        const historyArray = extractReports(rawResponse, 'reports');
        if (!historyArray || historyArray.length === 0) throw new Error("No OCR reports found.");
        setHistoryList(historyArray);
        if (!reportId) setSelectedHistoryId(historyArray[0].reportid); 

      } else if (modelName === 'Stroke') {
        const rawResponse = await getDoctorPatientStrokeHistory(Number(patientId));
        const historyArray = extractReports(rawResponse, 'strokeReports');
        if (!historyArray || historyArray.length === 0) throw new Error("No Stroke reports found.");
        setHistoryList(historyArray);
        if (!reportId) setSelectedHistoryId(historyArray[0].strokereportid); 

      } else if (modelName === 'CADICA') {
        if (!reportId) throw new Error("CADICA Report ID missing.");
        setSelectedHistoryId(Number(reportId)); 
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to load ${modelName} history`);
      onClose(); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedHistoryId && modelName) {
      fetchPredictionDetails(selectedHistoryId);
    }
  }, [selectedHistoryId, modelName]);

  const fetchPredictionDetails = async (id: number) => {
    setIsLoading(true);
    try {
      if (modelName === 'Cardiovascular') {
        const baseInfo = historyList.find(h => h.reportid === id) || {};
        try {
            // 🔥 Yahan Ab NLP Data Wali API Call Ho Rahi Hai
            const predictionData = await getCardioReportDetails(id);
            setData({ ...baseInfo, ...predictionData });
        } catch (e) {
            setData(baseInfo);
        }
      } else if (modelName === 'Stroke') {
        const baseInfo = historyList.find(h => h.strokereportid === id) || {};
        try {
            const predictionData = await doctorGetStrokePrediction(id);
            setData({ ...baseInfo, ...predictionData });
        } catch (e) {
            setData(baseInfo);
        }
      } else if (modelName === 'CADICA') {
        const predictionData = await doctorGetCadicaPrediction(id);
        setData(predictionData);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load prediction details");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isOcr = modelName === 'Cardiovascular';
  const isStroke = modelName === 'Stroke';
  const isCadica = modelName === 'CADICA';

  // --- NLP Data Extraction ---
  const aiDetails = data?.aiResult || data;
  let displayFeatures = data?.feature;
  const nlpDetails = data?.cardioNlpResult; // 🔥 NLP Feature Catch

  if (!displayFeatures && aiDetails?.keyparameters) {
      try {
          const parts = aiDetails.keyparameters.split(', ');
          const bp = parts.find((p: string) => p.startsWith('BP:'))?.split(': ')[1]?.split('/') || [];
          displayFeatures = {
              ap_hi: bp[0] || 'N/A',
              ap_lo: bp[1] || 'N/A',
              cholesterol: parts.find((p: string) => p.startsWith('Cholesterol:'))?.split(': ')[1] || 'N/A',
              gluc: parts.find((p: string) => p.startsWith('Glucose:'))?.split(': ')[1] || 'N/A'
          };
      } catch (e) {}
  }

  const ocrPrediction = aiDetails?.prediction; 
  const ocrConfidence = aiDetails?.probability;

  const strokeResult = data?.strokeResult || data?.modelResult;
  const isStrokeDetected = strokeResult?.prediction && strokeResult.prediction !== "No Stroke";

  const cadicaResult = data?.cadicaResult || data?.modelResult;
  const isLesionDetected = cadicaResult?.verdict === "LESION";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {isOcr && <Activity className="text-indigo-600" />}
              {isStroke && <BrainCircuit className="text-indigo-600" />}
              {isCadica && <Video className="text-indigo-600" />}
              {modelName} AI Alert
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Patient: <span className="text-indigo-600 font-bold">{patientName}</span> (ID: #{patientId})
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        {/* 🚨 HISTORY DROPDOWN (ONLY FOR OCR & STROKE) 🚨 */}
        {(isOcr || isStroke) && historyList.length > 1 && (
           <div className="px-6 py-3 bg-slate-100/50 border-b border-slate-100 flex items-center gap-3">
             <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Calendar size={16}/> Report History:</span>
             <select 
               value={selectedHistoryId || ''} 
               onChange={(e) => setSelectedHistoryId(Number(e.target.value))}
               disabled={isLoading}
               className="bg-white border border-slate-200 text-sm font-medium text-slate-700 px-3 py-1.5 rounded-lg outline-none cursor-pointer hover:border-indigo-300 disabled:opacity-50"
             >
               {historyList.map((report: any) => {
                 const rId = report.reportid || report.strokereportid || report.id;
                 return (
                   <option key={rId} value={rId}>
                     {formatDate(report.uploadedat)} {report.filename ? `- ${report.filename.substring(0, 15)}...` : ''}
                   </option>
                 );
               })}
             </select>
           </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
              <p className="font-medium text-slate-500">Extracting NLP Insights...</p>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center h-64 text-slate-400">No data found</div>
          ) : (
            <div className="space-y-6">
              
              {/* ================================== */}
              {/* OCR & NLP RENDER LOGIC             */}
              {/* ================================== */}
              {isOcr && aiDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`rounded-xl p-6 border ${ocrPrediction === 1 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <h4 className={`font-bold mb-2 flex items-center gap-2 ${ocrPrediction === 1 ? 'text-red-800' : 'text-emerald-800'}`}>
                      {ocrPrediction === 1 ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />} Risk Classification
                    </h4>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-medium opacity-80">Verdict:</span>
                      <span className={`text-3xl font-black tracking-tight ${ocrPrediction === 1 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {aiDetails.classification ? aiDetails.classification.toUpperCase() : 'UNKNOWN'}
                      </span>
                    </div>
                    {ocrConfidence !== undefined && (
                      <div className="mt-6">
                        <div className="flex justify-between text-xs font-bold mb-2 text-slate-700">
                          <span>AI Confidence</span>
                          <span>{(ocrConfidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200/50 rounded-full h-2">
                          <div className={`h-2 rounded-full ${ocrPrediction === 1 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${ocrConfidence * 100}%` }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {displayFeatures && (
                      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                        <h4 className="font-semibold text-slate-700 text-xs uppercase mb-3 flex items-center gap-2"><HeartPulse size={14} /> Key Vitals Extracted</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-slate-50 p-2 rounded-lg text-center"><span className="block text-slate-400 text-[10px]">Systolic</span><span className="font-bold text-slate-800">{displayFeatures.ap_hi || 'N/A'}</span></div>
                          <div className="bg-slate-50 p-2 rounded-lg text-center"><span className="block text-slate-400 text-[10px]">Diastolic</span><span className="font-bold text-slate-800">{displayFeatures.ap_lo || 'N/A'}</span></div>
                          <div className="bg-slate-50 p-2 rounded-lg text-center"><span className="block text-slate-400 text-[10px]">Cholesterol</span><span className="font-bold text-slate-800">{displayFeatures.cholesterol || 'N/A'}</span></div>
                          <div className="bg-slate-50 p-2 rounded-lg text-center"><span className="block text-slate-400 text-[10px]">Glucose</span><span className="font-bold text-slate-800">{displayFeatures.gluc || 'N/A'}</span></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 🔥 NEW: ADVANCED NLP ANALYSIS IN MODAL 🔥 */}
                  {nlpDetails && (
                    <div className="md:col-span-2 mt-4 border-t border-slate-200 pt-6 animate-in fade-in slide-in-from-bottom-4">
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
                                  <div key={index} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
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

              {/* ================================== */}
              {/* STROKE (CT SCAN) RENDER LOGIC      */}
              {/* ================================== */}
              {isStroke && strokeResult && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className={`rounded-xl p-6 border ${isStrokeDetected ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <h4 className="text-slate-800 font-bold mb-2 flex items-center gap-2">
                        {isStrokeDetected ? <AlertCircle className="text-rose-600"/> : <CheckCircle2 className="text-emerald-600"/>} AI Detection Result
                      </h4>
                      <p className={`text-3xl font-black ${isStrokeDetected ? 'text-rose-600' : 'text-emerald-600'} tracking-tight capitalize`}>
                        {strokeResult.prediction}
                      </p>
                      {strokeResult.confidence !== undefined && (
                        <div className="mt-6 pt-5 border-t border-black/5">
                          <div className="flex justify-between text-sm mb-2 font-bold text-slate-700">
                              <span>Overall Confidence</span>
                              <span>{(strokeResult.confidence * 100).toFixed(2)}%</span>
                          </div>
                          <div className="w-full bg-slate-200/60 rounded-full h-2.5">
                              <div className={`${isStrokeDetected ? 'bg-rose-500' : 'bg-emerald-500'} h-2.5 rounded-full`} style={{ width: `${strokeResult.confidence * 100}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center border-4 border-slate-800 shadow-inner overflow-hidden relative min-h-[300px]">
                    {strokeResult.resultImageUrl ? (
                      <div className="w-full h-full flex flex-col items-center">
                        {strokeResult.overlayImageUrl ? (
                          <div className="grid grid-cols-2 gap-2 w-full">
                            <div className="text-center">
                              <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Original</p>
                              <img src={strokeResult.resultImageUrl} alt="CT Scan Original" className="w-full h-48 rounded-lg object-contain bg-black" />
                            </div>
                            <div className="text-center">
                              <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Heatmap</p>
                              <img src={strokeResult.overlayImageUrl} alt="CT Scan Overlay" className="w-full h-48 rounded-lg object-contain bg-black" />
                            </div>
                          </div>
                        ) : (
                          <img src={strokeResult.resultImageUrl} alt="CT Scan Analysis" className="max-h-[300px] rounded-lg object-contain" />
                        )}
                      </div>
                    ) : (
                        <p className="text-slate-500 font-medium flex flex-col items-center gap-2">
                           <ImageIcon size={32} className="opacity-50"/> No processed image returned
                        </p>
                    )}
                  </div>
                </div>
              )}

              {/* ================================== */}
              {/* CADICA RENDER LOGIC                */}
              {/* ================================== */}
              {isCadica && cadicaResult && (
                  <div className="space-y-6">
                      <div className={`rounded-xl p-6 border ${isLesionDetected ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                          <h4 className="text-slate-800 font-bold mb-2 flex items-center gap-2">
                              {isLesionDetected ? <AlertCircle className="text-rose-600"/> : <CheckCircle2 className="text-emerald-600"/>} AI Evaluation Verdict
                          </h4>
                          <p className={`text-3xl font-black ${isLesionDetected ? 'text-rose-600' : 'text-emerald-600'} tracking-tight uppercase`}>
                              {cadicaResult.verdict}
                          </p>
                      </div>
                      <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center border-4 border-slate-800 shadow-inner overflow-hidden relative min-h-[300px]">
                          {cadicaResult.summaryImageUrl ? (
                              <img src={cadicaResult.summaryImageUrl} alt="Angiography Summary" className="max-h-[300px] w-full rounded-lg object-contain bg-black" />
                          ) : (
                              <div className="text-slate-500 flex flex-col items-center">
                                  <ImageIcon size={48} className="mb-3 opacity-30" />
                                  <p>No summary image available</p>
                              </div>
                          )}
                      </div>
                  </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}