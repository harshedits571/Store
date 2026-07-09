import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function GET() {
  try {
    await setDoc(doc(db, 'admins', 'harsheks12345@gmail.com'), {
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    return NextResponse.json({ success: true, message: 'Admin initialized' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
