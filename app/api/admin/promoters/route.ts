import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const [appsSnap, promotersSnap, grantsSnap, requestsSnap, proofsSnap, commsSnap, usersSnap, ordersSnap] = await Promise.all([
      adminDb.collection('promoter_applications').get(),
      adminDb.collection('promoters').get(),
      adminDb.collection('promoter_grants').get(),
      adminDb.collection('promoter_requests').get(),
      adminDb.collection('promoter_proof_submissions').get(),
      adminDb.collection('promoter_commissions').get(),
      adminDb.collection('users').get().catch(() => ({ docs: [] as any[] })),
      adminDb.collection('orders').get().catch(() => ({ docs: [] as any[] })),
    ]);

    // Build email to real Google Profile Photo map
    const userPhotoMap: Record<string, string> = {};
    for (const u of usersSnap.docs) {
      const data = u.data();
      const email = (data.email || '').toLowerCase().trim();
      if (email && data.photoURL) {
        userPhotoMap[email] = data.photoURL;
      }
    }

    for (const o of ordersSnap.docs) {
      const data = o.data();
      const email = (data.customerEmail || data.email || '').toLowerCase().trim();
      if (email && data.photoURL && !userPhotoMap[email]) {
        userPhotoMap[email] = data.photoURL;
      }
    }

    const applications = appsSnap.docs.map((d: any) => {
      const data = d.data();
      const email = (data.email || '').toLowerCase().trim();
      return {
        id: d.id,
        ...data,
        photoURL: data.photoURL || data.avatarUrl || userPhotoMap[email] || null
      };
    });

    const promoters = promotersSnap.docs.map((d: any) => {
      const data = d.data();
      const email = (data.email || d.id || '').toLowerCase().trim();
      return {
        id: d.id,
        ...data,
        photoURL: data.photoURL || data.avatarUrl || userPhotoMap[email] || null
      };
    });

    const promoterEmails = new Set(promoters.map((p: any) => p.email?.toLowerCase() || ''));

    // Merge both Grants & Claimed Project Files for all creators
    const grantsMap = new Map<string, any>();
    
    for (const d of grantsSnap.docs) {
      const data = d.data();
      const email = (data.promoterEmail || '').toLowerCase().trim();
      const pId = data.productId || data.productName || d.id;
      const key = `${email}_${pId}`;
      grantsMap.set(key, {
        id: d.id,
        ...data,
        photoURL: data.photoURL || userPhotoMap[email] || null
      });
    }

    // Also include any project files/assets ordered/claimed by the creator
    for (const o of ordersSnap.docs) {
      const oData = o.data();
      const oEmail = (oData.customerEmail || oData.email || '').toLowerCase().trim();
      if (promoterEmails.has(oEmail)) {
        const items = Array.isArray(oData.items) && oData.items.length > 0
          ? oData.items
          : [{ id: oData.productId, name: oData.productName || 'Project File', category: oData.productCategory || 'Project File' }];
        
        for (const item of items) {
          const pId = item.id || item.productId || item.name;
          const key = `${oEmail}_${pId}`;
          if (!grantsMap.has(key)) {
            grantsMap.set(key, {
              id: `claim_${o.id}_${pId}`,
              promoterEmail: oEmail,
              productId: item.id || item.productId || '',
              productName: item.name || oData.productName || 'Project File',
              productCategory: item.category || oData.productCategory || 'Project File',
              licenseKey: null, // Direct Asset (No Key Needed)
              requiresKey: false,
              status: 'approved_permanent',
              isPermanent: true,
              commissionRate: 0,
              createdAt: oData.createdAt || new Date().toISOString(),
              photoURL: userPhotoMap[oEmail] || null
            });
          }
        }
      }
    }

    const grants = Array.from(grantsMap.values());

    const requests = requestsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const proofs = proofsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const commissions = commsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({
      success: true,
      applications,
      promoters,
      grants,
      requests,
      proofs,
      commissions,
    });
  } catch (error: any) {
    console.error('Error fetching admin promoters data:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch promoter data' },
      { status: 500 }
    );
  }
}
