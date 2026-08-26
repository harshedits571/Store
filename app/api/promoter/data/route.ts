import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get('email');

    if (!emailParam) {
      return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
    }

    const cleanEmail = emailParam.trim().toLowerCase();

    // 1. Fetch promoter profile (case-insensitive scan)
    let promoterProfile: any = null;
    const allPromotersSnap = await adminDb.collection('promoters').get();
    for (const doc of allPromotersSnap.docs) {
      const data = doc.data();
      const pEmail = (data.email || doc.id || '').trim().toLowerCase();
      if (pEmail === cleanEmail) {
        promoterProfile = { id: doc.id, ...data };
        break;
      }
    }

    // 2. Fetch grants from promoter_grants (case-insensitive scan)
    const allGrantsSnap = await adminDb.collection('promoter_grants').get();
    const grants: any[] = allGrantsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((g: any) => {
        const gEmail = (g.promoterEmail || g.email || '').trim().toLowerCase();
        return gEmail === cleanEmail;
      });

    // 3. Also fetch all trial or granted licenses directly from licenses collection
    const allLicSnap = await adminDb.collection('licenses').get();
    const userLicenses = allLicSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((l: any) => {
        const lEmail = (l.email || '').trim().toLowerCase();
        return lEmail === cleanEmail && (l.isPromoterTrial === true || l.type === 'promoter_trial' || (typeof l.note === 'string' && l.note.toLowerCase().includes('trial')));
      });

    for (const lData of userLicenses) {
      const existing = grants.find(g => g.licenseKey === lData.licenseKey || g.productId === lData.productId);
      if (!existing) {
        grants.push({
          id: lData.id || lData.licenseKey,
          licenseKey: lData.licenseKey || lData.id,
          promoterEmail: cleanEmail,
          productId: lData.productId,
          productName: lData.productName || 'Creative Extension',
          productCategory: lData.category || 'Plugin',
          status: lData.status === 'active' ? 'trial_active' : lData.status,
          trialDays: lData.trialDurationDays || 7,
          expiresAt: lData.expiresAt,
          createdAt: lData.createdAt,
          isPermanent: !lData.isPromoterTrial,
        });
      }
    }

    // 4. Fetch product requests (case-insensitive scan)
    const allReqSnap = await adminDb.collection('promoter_requests').get();
    const requests = allReqSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((r: any) => (r.promoterEmail || r.email || '').trim().toLowerCase() === cleanEmail);

    // 5. Fetch commissions (case-insensitive scan)
    const allCommsSnap = await adminDb.collection('promoter_commissions').get();
    const commissions = allCommsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((c: any) => (c.promoterEmail || c.email || '').trim().toLowerCase() === cleanEmail);
    
    commissions.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // 6. Fetch payouts history (case-insensitive scan)
    const allPayoutsSnap = await adminDb.collection('promoter_payouts').get();
    const payouts = allPayoutsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((p: any) => (p.promoterEmail || p.email || '').trim().toLowerCase() === cleanEmail);
    
    payouts.sort((a: any, b: any) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime());

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      promoterProfile,
      grants,
      requests,
      commissions,
      payouts,
    });
  } catch (error: any) {
    console.error('Error fetching promoter data:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}
