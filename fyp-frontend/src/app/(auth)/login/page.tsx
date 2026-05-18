"use client";
import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, Stethoscope, ShieldCheck, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adminLogin, doctorLogin, radiologistLogin } from '@/services/apiService';
import Cookies from 'js-cookie';
// --- REDUX & JWT IMPORTS ---
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { setAuth } from '@/lib/store/features/authSlice';
import { jwtDecode } from 'jwt-decode';

export default function LoginPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();

    // Redux se check karein agar user pehle se login hai
    const { isAuthenticated, role: reduxRole } = useAppSelector((state) => state.auth);

    const [role, setRole] = useState('doctor'); // Default selected role
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // --- ALREADY LOGGED IN CHECK ---
    // Agar user pehle se login hai (token cookies mein hai), toh direct dashboard bhejo
    useEffect(() => {
        if (isAuthenticated && reduxRole) {
            const userRole = reduxRole.toLowerCase();
            if (userRole === 'admin') {
                window.location.href = '/admin/dashboard';
            } else if (userRole === 'doctor') {
                window.location.href = '/doctor/dashboard';
            } else if (userRole === 'radiologist') {
                window.location.href = '/radiologist/upload';
            }
        }
    }, [isAuthenticated, reduxRole, router]);

    // --- FORM SUBMISSION HANDLER ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;
            const payload = { email, password };

            // 1. API Call based on Role
            if (role === 'admin') {
                response = await adminLogin(payload);
            } else if (role === 'doctor') {
                response = await doctorLogin(payload);
            } else if (role === 'radiologist') {
                response = await radiologistLogin(payload);
            }

            if (response && response.access_token) {
                const token = response.access_token;

                // Token ko decode karo user info nikalne k liye
                let decodedUser: any = {};
                try {
                    decodedUser = jwtDecode(token);
                } catch (decodeErr) {
                    console.error("Token decoding failed", decodeErr);
                }

                const finalRole = decodedUser.role ? decodedUser.role.toLowerCase() : role.toLowerCase();

                // ========================================================
                // FIX: YAHAN COOKIES DIRECTLY SET KARO REDIRECT SE PEHLE
                // ========================================================
                Cookies.set('authToken', token, { expires: 1, path: '/' });
                Cookies.set('userRole', finalRole, { expires: 1, path: '/' });
                localStorage.setItem('accessToken', token);

                // REDUX STORE KO UPDATE KARO
                dispatch(setAuth({
                    token: token,
                    user: decodedUser,
                    role: finalRole
                }));
                console.log(finalRole);
                // Role based redirection (Hard redirect)
                if (finalRole === 'admin') {
                    window.location.href = '/admin/dashboard';
                } else if (finalRole === 'doctor') {
                    window.location.href = '/doctor/dashboard';
                } else if (finalRole === 'radiologist') {
                    window.location.href = '/radiologist/upload';
                }
            }

        } catch (err: any) {
            setError(err.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans">

            {/* --- LEFT SIDE: LOGIN FORM --- */}
            

            {/* --- RIGHT SIDE: BRANDING (Desktop Only) --- */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-600 to-violet-700 relative overflow-hidden items-center justify-center p-12 text-white">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-20 translate-x-20"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl translate-y-20 -translate-x-20"></div>

                <div className="relative z-10 max-w-lg">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                            <Stethoscope size={32} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight">MediPortal</h1>
                    </div>

                    <h2 className="text-3xl font-bold mb-6 leading-tight">
                        Streamline your healthcare management with AI precision.
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all cursor-default">
                            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-300">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold">AI-Powered Diagnostics</h3>
                                <p className="text-sm text-indigo-100">Real-time risk assessment for patients.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all cursor-default">
                            <div className="bg-amber-500/20 p-2 rounded-lg text-amber-300">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold">Secure & Confidential</h3>
                                <p className="text-sm text-indigo-100">Enterprise-grade security for medical data.</p>
                            </div>
                        </div>
                    </div>

                    <p className="mt-12 text-indigo-200 text-sm">© 2025 MediPortal Inc. All rights reserved.</p>
                </div>
            </div>

            {/* --- LEFT SIDE: LOGIN FORM --- */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 transition-all duration-300">
                <div className="w-full max-w-md space-y-8">

                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-8">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white">
                            <Stethoscope size={24} />
                        </div>
                        <span className="text-2xl font-extrabold text-slate-800 tracking-tight">MediPortal</span>
                    </div>

                    {/* Header Text */}
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
                        <p className="mt-2 text-slate-500">Please select your role and sign in.</p>
                    </div>

                    {/* Role Selector Tabs */}
                    <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                        {['admin', 'doctor', 'radiologist'].map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => { setRole(r); setError(''); }}
                                className={`py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${role === r
                                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-100 ring-1 ring-black/5'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">

                        {/* Email Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail size={20} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@hospital.com"
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold text-slate-700">Password</label>
                                <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">Forgot password?</a>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock size={20} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400"
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Message Display */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                <p className="text-sm text-red-600 font-medium text-center">{error}</p>
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Sign in as {role.charAt(0).toUpperCase() + role.slice(1)} <ArrowRight size={18} /></>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500">
                        Don't have an account? <span className="font-semibold text-slate-400 cursor-not-allowed">Contact Admin</span>
                    </p>
                </div>
            </div>

        </div>
    );
}