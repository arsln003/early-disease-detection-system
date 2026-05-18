import { NextResponse } from 'next/server';

export async function GET() {
  // Yeh route server-side par run hota hai, isliye isko .env ka sab pata hai
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Hum config ko JavaScript variable mein convert kar ke bhej rahay hain
  const jsContent = `self.firebaseConfig = ${JSON.stringify(config)};`;

  return new NextResponse(jsContent, {
    headers: {
      'Content-Type': 'application/javascript', // IMPORTANT: Service worker ko JS format chahiye
      'Cache-Control': 'public, max-age=3600',
    },
  });
}