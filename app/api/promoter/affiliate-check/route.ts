import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const codeParam = searchParams.get('code');

    if (!codeParam) {
      return NextResponse.json({ success: false, error: 'Code required' }, { status: 400 });
    }

    const cleanCode = codeParam.trim().toUpperCase();

    // 1. Check custom_links
    const linkDoc = await adminDb.collection('custom_links').doc(cleanCode).get();
    if (linkDoc.exists) {
      const linkData = linkDoc.data();
      return NextResponse.json({
        success: true,
        discountPercent: linkData?.discountPercent || 10,
        promoter: {
          name: linkData?.note || 'Creator',
          email: linkData?.promoterEmail || ''
        }
      });
    }

    // 2. Check promoters collection by referralCode
    const promSnap = await adminDb.collection('promoters')
      .where('referralCode', '==', cleanCode)
      .get();

    if (!promSnap.empty) {
      const pData = promSnap.docs[0].data();
      return NextResponse.json({
        success: true,
        discountPercent: 10,
        promoter: {
          name: pData.name || 'Creator',
          email: pData.email || promSnap.docs[0].id
        }
      });
    }

    // 3. Check promoters collection by email handle
    const allPromSnap = await adminDb.collection('promoters').get();
    for (const doc of allPromSnap.docs) {
      const pData = doc.data();
      const derivedCode = (doc.id.split('@')[0] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (derivedCode === cleanCode || pData.referralCode?.toUpperCase() === cleanCode) {
        return NextResponse.json({
          success: true,
          discountPercent: 10,
          promoter: {
            name: pData.name || 'Creator',
            email: pData.email || doc.id
          }
        });
      }
    }

    return NextResponse.json({ success: false, error: 'Not a promoter code' }, { status: 404 });
  } catch (error: any) {
    console.error('Error checking promoter affiliate:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
