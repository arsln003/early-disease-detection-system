import React from 'react';
import Link from 'next/link';
import { ArrowRight, Activity, ShieldCheck, Zap, Stethoscope } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Stethoscope size={24} />
            </div>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">MediPortal</span>
          </div>
          <Link 
            href="/login" 
            className="hidden md:flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-violet-400 blur-[100px] rounded-full" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
            CDDS version 2.0 is now live
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
            Next-Generation <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Cardiovascular Detection
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
            Empowering doctors and radiologists with AI-driven insights. Manage patients, upload reports, and detect critical heart conditions with unprecedented accuracy.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 text-lg"
            >
              Go to Login Portal <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>

      {/* --- FEATURES SECTION --- */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
                <Activity size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Predictions</h3>
              <p className="text-slate-600 leading-relaxed">
                Utilize advanced machine learning models to analyze medical reports and predict cardiovascular disease risks instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">OCR Integration</h3>
              <p className="text-slate-600 leading-relaxed">
                Seamlessly extract critical data from scanned ECG, X-Ray, and Blood Test reports using automated OCR technology.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Role-Based Security</h3>
              <p className="text-slate-600 leading-relaxed">
                Enterprise-grade architecture ensuring secure access for Admins, Doctors, and Radiologists with dedicated dashboards.
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 py-12 text-center text-slate-400">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Stethoscope size={20} className="text-indigo-400" />
          <span className="text-xl font-bold text-white tracking-tight">MediPortal</span>
        </div>
        <p>© 2026 Cardiovascular Disease Detection System. All rights reserved.</p>
      </footer>

    </div>
  );
}