"use client";
import React from 'react';
import { 
  X, Activity, FileText, Calendar, Phone, User, 
  Brain, AlertTriangle, CheckCircle, ClipboardList, Stethoscope 
} from 'lucide-react';

// --- TYPES & INTERFACES ---

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  status: string;
  risk: string;
  riskColor: string;
}

interface FeatureImportance {
  feature: string;
  value: string;
  impact: 'High' | 'Medium' | 'Low';
}

interface DiseasePrediction {
  disease: string;
  probability: string;
  suggestedTests: string[];
}

interface PatientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({ isOpen, onClose, patient }) => {
  if (!isOpen || !patient) return null;

  // --- MOCK AI LOGIC (Backend se ayega) ---
  // Scenario: Agar patient Critical hai to High Risk waly features dikhao
  const isCritical = patient.status === 'Critical';

  const contributingFactors: FeatureImportance[] = isCritical ? [
    { feature: 'Chest Pain Type', value: 'Asymptomatic (ASY)', impact: 'High' },
    { feature: 'ST Slope', value: 'Flat', impact: 'High' },
    { feature: 'Cholesterol', value: '289 mg/dl', impact: 'Medium' },
    { feature: 'Exercise Angina', value: 'Yes', impact: 'Medium' },
  ] : [
    { feature: 'Blood Pressure', value: '120/80', impact: 'Low' },
    { feature: 'Cholesterol', value: '180 mg/dl', impact: 'Low' },
  ];

  const possibleDiseases: DiseasePrediction[] = isCritical ? [
    { 
      disease: 'Coronary Artery Disease (CAD)', 
      probability: '85%', 
      suggestedTests: ['Coronary Angiography', 'Stress Echocardiogram'] 
    },
    { 
      disease: 'Myocardial Ischemia', 
      probability: '60%', 
      suggestedTests: ['Troponin Blood Test', 'ECG Monitoring'] 
    }
  ] : [
    { 
      disease: 'General Fatigue / Routine', 
      probability: '95%', 
      suggestedTests: ['CBC (Complete Blood Count)', 'Vitamin D Test'] 
    }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shadow-sm">
                {patient.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{patient.name}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="bg-slate-200 px-2 py-0.5 rounded text-xs font-semibold text-slate-700">ID: #{patient.id}024</span>
                <span>•</span>
                <span>{patient.gender}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 bg-white">
            
            {/* 1. Basic Vitals Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Age', value: `${patient.age} Yrs`, icon: User },
                    { label: 'Contact', value: '(555) 123-4567', icon: Phone },
                    { label: 'Last Visit', value: 'Oct 24, 2025', icon: Calendar },
                    { label: 'Blood Type', value: 'O+', icon: Activity },
                ].map((item, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center text-center gap-1">
                        <item.icon size={16} className="text-slate-400 mb-1" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-bold text-slate-700">{item.value}</p>
                    </div>
                ))}
            </div>

            {/* 2. AI Risk Score Analysis */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
                
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <Brain size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-slate-800">AI Diagnostic Engine</h4>
                        <p className="text-xs text-slate-500">Analysis based on Heart Disease UCI Dataset model</p>
                    </div>
                </div>

                {/* Risk Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-semibold text-slate-600">Predicted Risk Level</span>
                        <span className={`text-xl font-bold ${isCritical ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {patient.risk}
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden shadow-inner">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${isCritical ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                            style={{ width: patient.risk?.includes('%') ? patient.risk : '10%' }}
                        ></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    
                    {/* LEFT: Contributing Factors */}
                    <div>
                        <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-500" /> 
                            Contributing Features
                        </h5>
                        <div className="space-y-2">
                            {contributingFactors.map((factor, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{factor.feature}</p>
                                        <p className="text-xs text-slate-500">{factor.value}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                                        factor.impact === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                                        factor.impact === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        {factor.impact} Impact
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: Possible Diseases & Tests */}
                    <div>
                        <h5 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <Stethoscope size={16} className="text-indigo-500" /> 
                            Possible Conditions & Tests
                        </h5>
                        <div className="space-y-3">
                            {possibleDiseases.map((item, idx) => (
                                <div key={idx} className="bg-white border border-slate-100 rounded-lg p-3 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-bold text-slate-800">{item.disease}</p>
                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                            {item.probability} Prob.
                                        </span>
                                    </div>
                                    
                                    {/* Suggested Tests */}
                                    <div className="flex flex-wrap gap-2">
                                        {item.suggestedTests.map((test, tIdx) => (
                                            <span key={tIdx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-600 text-[10px] font-medium border border-slate-100">
                                                <ClipboardList size={10} /> {test}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/80 backdrop-blur-md sticky bottom-0">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-white hover:border-slate-400 transition-all text-sm"
            >
                Close View
            </button>
            <button className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all text-sm flex items-center gap-2 hover:-translate-y-0.5">
                <FileText size={18} /> Download Full Report
            </button>
        </div>

      </div>
    </div>
  );
};

export default PatientDetailsModal;