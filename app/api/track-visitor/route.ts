import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const docRef = adminDb.collection('stats').doc('visitors');
    await docRef.set({ count: FieldValue.increment(1) }, { merge: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to track visitor', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const docRef = adminDb.collection('stats').doc('visitors');
    const snap = await docRef.get();
    if (snap.exists) {
      return NextResponse.json({ count: snap.data().count || 0 });
    }
    return NextResponse.json({ count: 0 });
  } catch (error) {
    console.error('Failed to get visitors', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
