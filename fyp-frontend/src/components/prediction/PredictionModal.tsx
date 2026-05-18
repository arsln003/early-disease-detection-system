import React, { useState, useEffect } from 'react';
import { X, Activity, HeartPulse, User, FileText, AlertCircle, CheckCircle2, Loader2, Sparkles, BrainCircuit, ClipboardList } from 'lucide-react';

interface UploadRecord {
  id: number;
  patientName: string;
  age: number | string;
  gender: string;
  reportType: string;
  uploadDate: string;
  status: string;
  prediction: number | null;
  features: any;
  notes?: string;
  filename?: string;
  aiResult?: any;
}

interface PredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: UploadRecord | null;
  predictionData: any;
  isLoading: boolean;
  onSeePrediction: () => void;
}

export default function PredictionModal({ isOpen, onClose, record, predictionData, isLoading, onSeePrediction }: PredictionModalProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (!isOpen) setIsRevealed(false);
  }, [isOpen]);

  if (!isOpen || !record) return null;

  // --- DATA EXTRACTION ---
  const aiDetails = predictionData?.aiResult || predictionData || record.aiResult;
  const displayFeatures = predictionData?.feature || predictionData?.ocrResult?.fields || record?.features;
  
  const rawAge = displayFeatures?.age || record.age;
  const rawGender = displayFeatures?.gender !== undefined 
    ? (displayFeatures.gender === 1 ? 'Female' : displayFeatures.gender === 2 ? 'Male' : displayFeatures.gender) 
    : record.gender;

  const formatAge = (age: any) => {
    if (!age || age === 'N/A') return 'N/A';
    const numAge = Number(age);
    if (numAge > 1000) return `${Math.floor(numAge / 365)} years (${numAge} days)`;
    return `${numAge} years (${Math.floor(numAge * 365)} days)`;
  };

  // --- PREDICTION LOGIC ---
  const displayPrediction = aiDetails?.prediction !== undefined ? aiDetails.prediction : record.prediction;
  let riskText = aiDetails?.classification ? aiDetails.classification.toUpperCase() : (displayPrediction === 1 ? 'HIGH RISK' : displayPrediction === 0 ? 'LOW RISK' : 'NO DATA');
  const confidenceScore = aiDetails?.probability;

  // UI Check: Kya AI Data Mojood hai?
  const hasValidPrediction = aiDetails && aiDetails.classification && aiDetails.classification !== "No AI Result";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-indigo-600" size={24} />
            Diagnostic Report & AI Analysis
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            
            {/* Left Column: Patient & Document Info (Spans 5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
                <h4 className="font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                  <User size={18} /> Patient Information
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-indigo-100/50 pb-2">
                    <span className="text-slate-500">Name</span>
                    <span className="font-medium text-slate-800 capitalize">{record.patientName}</span>
                  </div>
                  <div className="flex justify-between border-b border-indigo-100/50 pb-2">
                    <span className="text-slate-500">Age / Gender</span>
                    <span className="font-medium text-slate-800">{formatAge(rawAge)} / {rawGender}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-slate-500">Upload Date</span>
                    <span className="font-medium text-slate-800">{record.uploadDate}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText size={18} /> Document Details
                </h4>
                <div className="text-sm space-y-3">
                   <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">File Name</span>
                    <span className="font-medium text-indigo-600 break-all">{predictionData?.filename || record.filename || 'Document'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Radiologist Comments:</span>
                    <p className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 italic">
                      {predictionData?.comment || record.notes || 'No comments available.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: AI Prediction Area (Spans 7 cols) */}
            <div className="lg:col-span-7 space-y-6 flex flex-col h-full">
              
              {!isRevealed && !hasValidPrediction ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-indigo-100 border-dashed rounded-xl bg-indigo-50/30 text-center">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                    <Sparkles size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-2">AI Analysis Data Available</h4>
                  <p className="text-sm text-slate-500 mb-6 px-4">
                    Click below to fetch the detailed cardiovascular risk prediction and parameters from the database.
                  </p>
                  <button 
                    onClick={() => { setIsRevealed(true); onSeePrediction(); }}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 active:scale-95"
                  >
                    <HeartPulse size={20} /> Load AI Prediction
                  </button>
                </div>
              ) : isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full gap-4 border border-slate-100 rounded-xl bg-slate-50">
                  <Loader2 className="animate-spin text-indigo-600" size={48} />
                  <p className="text-slate-500 font-medium animate-pulse">Fetching AI data...</p>
                </div>
              ) : (
                <>
                  {/* RISK BADGE */}
                  <div className={`rounded-xl p-6 border ${
                    displayPrediction === 1 ? 'bg-red-50 border-red-200' : 
                    displayPrediction === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  } animate-in slide-in-from-bottom-4 duration-300`}>
                    <h4 className={`font-bold mb-2 flex items-center gap-2 ${
                      displayPrediction === 1 ? 'text-red-800' : 
                      displayPrediction === 0 ? 'text-emerald-800' : 'text-slate-700'
                    }`}>
                      {displayPrediction === 1 ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                      AI Risk Classification
                    </h4>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-medium opacity-80">Risk Assessment:</span>
                      <span className={`text-3xl font-black tracking-tight ${
                        displayPrediction === 1 ? 'text-red-600' : 
                        displayPrediction === 0 ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {riskText}
                      </span>
                    </div>
                  </div>

                  {/* TWO COLUMN GRID FOR AI DETAILS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-bottom-5 duration-400">
                      
                      {/* PROBABILITY & MODEL */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex justify-between items-center text-sm mb-4">
                            <span className="text-slate-600 font-semibold flex items-center gap-1.5"><BrainCircuit size={16}/> AI Confidence</span>
                            <span className="font-bold text-slate-800 text-lg">
                              {confidenceScore !== undefined ? `${(confidenceScore * 100).toFixed(1)}%` : 'N/A'}
                            </span>
                        </div>
                        {confidenceScore !== undefined && (
                          <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                              <div className={`h-2 rounded-full ${displayPrediction === 1 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${confidenceScore * 100}%` }}></div>
                          </div>
                        )}
                        <div className="pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-400 font-medium">
                            <span>Model Engine</span>
                            <span>{aiDetails?.modelname || 'CardioModelV1'}</span>
                        </div>
                      </div>

                      {/* REMARKS */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-center">
                         <span className="text-slate-600 font-semibold flex items-center gap-1.5 mb-2"><ClipboardList size={16}/> Clinical Remarks</span>
                         <p className={`text-sm font-medium leading-relaxed ${displayPrediction === 1 ? 'text-red-700' : 'text-emerald-700'}`}>
                           {aiDetails?.remarks || "No additional remarks generated."}
                         </p>
                      </div>
                  </div>

                  {/* KEY PARAMETERS DYNAMIC BADGES */}
                  {aiDetails?.keyparameters && (
                     <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 animate-in slide-in-from-bottom-6 duration-500">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Key Parameters Analyzed</span>
                        <div className="flex flex-wrap gap-2">
                           {aiDetails.keyparameters.split(',').map((param: string, index: number) => (
                              <span key={index} className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                                {param.trim()}
                              </span>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* OCR VITALS */}
                  {displayFeatures && (
                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-7 duration-500 shadow-sm">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                        <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                          <HeartPulse size={16} /> Extracted Vitals (OCR)
                        </h4>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                          <span className="text-slate-500">Systolic (ap_hi)</span>
                          <span className="font-semibold text-slate-800">{displayFeatures.ap_hi || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                          <span className="text-slate-500">Diastolic (ap_lo)</span>
                          <span className="font-semibold text-slate-800">{displayFeatures.ap_lo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                          <span className="text-slate-500">Cholesterol</span>
                          <span className="font-semibold text-slate-800">{displayFeatures.cholesterol || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-50 pb-1">
                          <span className="text-slate-500">Glucose</span>
                          <span className="font-semibold text-slate-800">{displayFeatures.gluc || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-colors shadow-sm">
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}