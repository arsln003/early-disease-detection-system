"use client";
import React, { useEffect, useState } from 'react';
import { X, Activity, BrainCircuit, HeartPulse, ClipboardList, AlertCircle, CheckCircle2, Loader2, Search, ImageIcon, Video } from 'lucide-react';
import toast from 'react-hot-toast';

// Direct Single Report APIs Import
import { 
  getCardioReportDetails, 
  getStrokeReportDetails,
  doctorGetCadicaPrediction 
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
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Jab Modal khule aur reportId majood ho, toh direct Single Report fetch karo
  useEffect(() => {
    if (isOpen && reportId && modelName) {
      fetchSpecificReport();
    }
  }, [isOpen, reportId, modelName]);

  const fetchSpecificReport = async () => {
    setIsLoading(true);
    setData(null);

    try {
      if (modelName === 'Cardiovascular') {
        const response = await getCardioReportDetails(Number(reportId));
        setData(response);
      } 
      else if (modelName === 'Stroke') {
        const response = await getStrokeReportDetails(Number(reportId));
        setData(response);
      } 
      else if (modelName === 'CADICA') {
        const response = await doctorGetCadicaPrediction(Number(reportId));
        setData(response);
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to load ${modelName} report details`);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // --- Rendering Variables ---
  const isOcr = modelName === 'Cardiovascular';
  const isStroke = modelName === 'Stroke';
  const isCadica = modelName === 'CADICA';

  // Extracting OCR data safely (from /doctors/cardio-reports/:id response)
  const aiDetails = data?.aiResult || data;
  let displayFeatures = data?.feature;
  
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
  const nlpSummary = data?.cardioNlpResult?.clinicalSummary;

  // Extracting Stroke data safely
  const strokeResult = data?.strokeResult || data?.modelResult || data;
  const isStrokeDetected = strokeResult?.prediction && strokeResult.prediction !== "No Stroke";

  // Extracting Cadica data safely
  const cadicaResult = data?.cadicaResult || data?.modelResult || data;
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

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
              <p className="font-medium text-slate-500">Loading Report Details...</p>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center h-64 text-slate-400">No data found</div>
          ) : (
            <div className="space-y-6">
              
              {/* ================================== */}
              {/* OCR (CARDIOVASCULAR) RENDER LOGIC  */}
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
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                      <span className="text-slate-600 font-bold flex items-center gap-1.5 mb-2"><ClipboardList size={16}/> Clinical AI Summary</span>
                      <p className={`text-sm font-medium leading-relaxed ${ocrPrediction === 1 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {nlpSummary || aiDetails.remarks || "No additional remarks generated."}
                      </p>
                    </div>

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

                    {strokeResult.probabilities && (
                      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Search size={16}/> Class Probabilities</h4>
                        <div className="space-y-3">
                          {Object.entries(strokeResult.probabilities).map(([key, val]: any) => {
                            const percentage = (val * 100).toFixed(2);
                            const isDominant = strokeResult.prediction === key;
                            return (
                              <div key={key}>
                                <div className="flex justify-between text-xs font-medium mb-1 text-slate-600">
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
                          {cadicaResult.confidence !== undefined && (
                              <div className="mt-6 pt-5 border-t border-black/5">
                                  <div className="flex justify-between text-sm mb-2 font-bold text-slate-700">
                                      <span>Overall Model Confidence</span>
                                      <span>{(cadicaResult.confidence * 100).toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200/60 rounded-full h-2.5">
                                      <div className={`${isLesionDetected ? 'bg-rose-500' : 'bg-emerald-500'} h-2.5 rounded-full`} style={{ width: `${cadicaResult.confidence * 100}%` }}></div>
                                  </div>
                              </div>
                          )}
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