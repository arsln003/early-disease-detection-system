import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Cookies nikalte waqt extra quotes (") ko hamesha remove karo
  const token = req.cookies.get('authToken')?.value?.replace(/"/g, '');
  const role = req.cookies.get('userRole')?.value?.replace(/"/g, '')?.toLowerCase();

  // 2. Har role ka sahi dashboard route yahan define kar diya
  const roleDashboards: Record<string, string> = {
    admin: '/admin/dashboard',
    doctor: '/doctor/dashboard',
    radiologist: '/radiologist/upload',
  };

  // Check karo kya link protected hai ya nahi
  const isProtectedRoute = 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/doctor') || 
    pathname.startsWith('/radiologist');

  // ==============================================================
  // SCENARIO 1: Bina Token andar aane ki koshish -> Seedha Login pe
  // ==============================================================
  if (!token && isProtectedRoute) {
    // FIX: Yahan '/' ki jagah '/login' kar diya hai
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // ==============================================================
  // SCENARIO 2: Login hai, aur Login (/) ya /login pe khara hai -> Apne Dashboard bhejo
  // ==============================================================
  // FIX: Yahan pathname === '/login' bhi add kar diya hai
  if (token && (pathname === '/' || pathname === '/login')) {
    // Role check karo aur uske sahi route par bhejo
    const targetUrl = role ? roleDashboards[role] : null;
    if (targetUrl) {
      return NextResponse.redirect(new URL(targetUrl, req.url));
    }
  }

  // ==============================================================
  // SCENARIO 3: Login hai, par KISI DOSRE k route pe ja raha hai
  // ==============================================================
  if (token && role) {
    const myCorrectDashboard = roleDashboards[role];

    // Agar doctor hai aur admin pe gaya -> wapas doctor pe bhejo
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(myCorrectDashboard, req.url));
    }
    // Agar admin hai aur doctor pe gaya -> wapas admin pe bhejo
    if (pathname.startsWith('/doctor') && role !== 'doctor') {
      return NextResponse.redirect(new URL(myCorrectDashboard, req.url));
    }
    // Agar admin/doctor radiologist pe gaya -> wapas apne dash pe bhejo
    if (pathname.startsWith('/radiologist') && role !== 'radiologist') {
      return NextResponse.redirect(new URL(myCorrectDashboard, req.url));
    }
  }

  // Sab valid hai toh route open kar do
  return NextResponse.next();
}

// Config mein bhi /login add kar diya hai
export const config = {
  matcher: [
    '/', 
    '/login',
    '/admin/:path*', 
    '/doctor/:path*', 
    '/radiologist/:path*'
  ],
};