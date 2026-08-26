import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const admins = ['harsheks12345@gmail.com', 'imcreativeeditsmov@gmail.com'];
    
    for (const email of admins) {
      await adminDb.collection('admins').doc(email).set({
        role: 'admin',
        createdAt: new Date().toISOString()
      });
    }
    
    return NextResponse.json({ success: true, message: 'Admins initialized successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
