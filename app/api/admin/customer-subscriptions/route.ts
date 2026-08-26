import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import Razorpay from 'razorpay';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Find all subscription licenses for this customer
    const licensesSnap = await adminDb.collection('licenses')
      .where('email', '==', email)
      .where('isSubscription', '==', true)
      .get();

    const uniqueSubscriptions = new Map();

    licensesSnap.forEach((doc: any) => {
      const data = doc.data();
      if (data.subscriptionId) {
        // If a customer bought it multiple times, we might have multiple licenses with the same subId.
        // We will just map the latest or a list of licenses.
        if (!uniqueSubscriptions.has(data.subscriptionId)) {
          uniqueSubscriptions.set(data.subscriptionId, {
            subscriptionId: data.subscriptionId,
            productName: data.productName,
            licenseKey: data.licenseKey,
            pendingCancellation: data.pendingCancellation || false
          });
        }
      }
    });

    const instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    const results = [];

    // 2. Fetch Razorpay data for each subscription
    for (const [subId, subMeta] of uniqueSubscriptions.entries()) {
      try {
        const razorpaySub = await instance.subscriptions.fetch(subId);
        
        // Fetch invoice history for this subscription
        const invoicesRes = await instance.invoices.all({ subscription_id: subId });
        const invoices = invoicesRes.items || [];
        
        results.push({
          meta: subMeta,
          subscription: razorpaySub,
          invoices: invoices
        });
      } catch (err: any) {
        console.error(`Error fetching Razorpay data for sub ${subId}:`, err);
        results.push({
          meta: subMeta,
          error: err.message
        });
      }
    }

    return NextResponse.json({ success: true, subscriptions: results });

  } catch (error: any) {
    console.error("Error fetching customer subscriptions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
