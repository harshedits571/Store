import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export async function GET() {
  try {
    const adminDoc = await getDoc(doc(db, 'admins', 'harsheks12345@gmail.com'));
    
    return NextResponse.json({ 
      exists: adminDoc.exists(),
      data: adminDoc.exists() ? adminDoc.data() : null
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
