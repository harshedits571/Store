import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    let licensesList: any[] = [];

    if (adminDb) {
      const snap = await adminDb.collection('licenses').get();
      licensesList = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } else {
      const snap = await getDocs(collection(db, 'licenses'));
      licensesList = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    }

    return NextResponse.json({ success: true, licenses: licensesList });
  } catch (error: any) {
    console.error("Admin licenses fetch error:", error);
    return NextResponse.json({ success: false, error: error.message, licenses: [] }, { status: 500 });
  }
}
