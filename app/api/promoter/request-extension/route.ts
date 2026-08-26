import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, productId, productName, productCategory, expectedTurnaroundDays, pitch } = body;

    if (!email || !productId) {
      return NextResponse.json(
        { success: false, error: 'Email and product ID are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    await adminDb.collection('promoter_requests').add({
      promoterEmail: cleanEmail,
      promoterName: name || 'Creator',
      productId,
      productName: productName || 'Extension',
      productCategory: productCategory || 'Plugin',
      expectedTurnaroundDays: parseInt(expectedTurnaroundDays, 10) || 7,
      pitch: pitch?.trim() || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in /api/promoter/request-extension:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error while requesting extension' },
      { status: 500 }
    );
  }
}
