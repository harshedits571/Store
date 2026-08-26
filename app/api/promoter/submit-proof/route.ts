import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grantId, proofUrl, proofNotes, email, name } = body;

    if (!grantId || !proofUrl) {
      return NextResponse.json(
        { success: false, error: 'Grant ID and proof URL are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Update promoter_grants record
    await adminDb.collection('promoter_grants').doc(grantId).update({
      proofUrl: proofUrl.trim(),
      proofNotes: proofNotes?.trim() || '',
      proofSubmittedAt: new Date().toISOString(),
      status: 'proof_submitted',
    });

    const grantSnap = await adminDb.collection('promoter_grants').doc(grantId).get();
    const grantData = grantSnap.data();

    // 2. Add to promoter_proof_submissions
    await adminDb.collection('promoter_proof_submissions').add({
      grantId,
      promoterEmail: cleanEmail || grantData?.promoterEmail,
      promoterName: name || 'Creator',
      productId: grantData?.productId || '',
      productName: grantData?.productName || 'Extension',
      proofUrl: proofUrl.trim(),
      proofNotes: proofNotes?.trim() || '',
      submittedAt: new Date().toISOString(),
      status: 'pending_review',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/promoter/submit-proof:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error while submitting proof' },
      { status: 500 }
    );
  }
}
