import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

function generate16DigitKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key.match(/.{1,4}/g)?.join('-') || key;
}

/**
 * GET /api/customer-licenses?email=user@example.com
 * Fetches all licenses for a user. If an order exists in `leads` but
 * license was not created yet, it automatically creates the active license key.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');

    if (!emailParam) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = emailParam.trim().toLowerCase();

    // 1. Fetch all existing licenses for this email
    const licSnap = await adminDb.collection('licenses')
      .where('email', '==', cleanEmail)
      .get();

    const existingLicenses = licSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // 2. Fetch all verified orders / leads for this email
    const leadsSnap = await adminDb.collection('leads')
      .where('email', '==', cleanEmail)
      .get();

    const verifiedOrders = leadsSnap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((o: any) => {
        const status = (o.status || '').toLowerCase();
        const isVerifiedStatus = status === 'verified' || status === 'completed' || status === 'success';
        const amount = Number(o.amount || 0);
        if (amount === 0) return isVerifiedStatus;
        return isVerifiedStatus && (!!o.paymentId || !!o.razorpay_payment_id);
      });

    // 3. Check if any verified item is missing a license
    for (const order of verifiedOrders as any[]) {
      if (!order.items || !Array.isArray(order.items)) continue;

      for (const item of order.items) {
        // Skip parent bundle container if individual items are present
        if (item.id === 'bundle' && order.items.length > 1) continue;

        const uniqueProductId = item.versionId ? `${item.id}_${item.versionId}` : item.id;
        const uniqueProductName = item.versionName ? `${item.name} (${item.versionName})` : (item.name || 'Creative Asset');

        // Check if already has a license for this product
        const hasLicense = existingLicenses.some((l: any) => 
          l.productId === uniqueProductId || l.productId === item.id || l.orderId === order.id
        );

        if (!hasLicense) {
          // Check if product requires license
          let requiresLic = true;
          try {
            const pDoc = await adminDb.collection('products').doc(item.id).get();
            if (pDoc.exists) {
              const pData = pDoc.data();
              if (pData?.requiresLicense === false) requiresLic = false;
            }
          } catch {}

          if (requiresLic) {
            const newKey = generate16DigitKey();
            const newLicData = {
              email: cleanEmail,
              licenseKey: newKey,
              productId: uniqueProductId,
              productName: uniqueProductName,
              orderId: order.id,
              paymentId: order.paymentId || 'DIRECT',
              isSubscription: !!order.razorpay_subscription_id,
              subscriptionId: order.razorpay_subscription_id || null,
              status: 'active',
              devices: [],
              createdAt: FieldValue.serverTimestamp()
            };

            await adminDb.collection('licenses').doc(newKey).set(newLicData);
            existingLicenses.push({ id: newKey, ...newLicData });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      licenses: existingLicenses
    });

  } catch (error: any) {
    console.error('Error in customer-licenses API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
