import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const textBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn("RAZORPAY_WEBHOOK_SECRET is not defined. Webhooks might not be secure.");
    }

    if (signature && webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(textBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(textBody);

    console.log(`Received Webhook Event: ${event.event}`);

    // Handle Subscription Cancellation, Halt, or Pause (Payment failed or cancelled)
    if (event.event === 'subscription.cancelled' || event.event === 'subscription.halted' || event.event === 'subscription.paused') {
      const subscriptionId = event.payload.subscription.entity.id;
      
      // Find all licenses linked to this subscription and mark them expired
      const licensesSnapshot = await adminDb.collection('licenses')
        .where('subscriptionId', '==', subscriptionId)
        .get();

      if (!licensesSnapshot.empty) {
        const batch = adminDb.batch();
        licensesSnapshot.docs.forEach((doc: any) => {
          batch.update(doc.ref, { status: 'expired' });
        });
        await batch.commit();
        console.log(`Deactivated ${licensesSnapshot.size} licenses for subscription ${subscriptionId}`);
      }

      // Find leads and update their status
      const leadsSnapshot = await adminDb.collection('leads')
        .where('razorpay_subscription_id', '==', subscriptionId)
        .get();

      if (!leadsSnapshot.empty) {
        const batch = adminDb.batch();
        leadsSnapshot.docs.forEach((doc: any) => {
          batch.update(doc.ref, { status: event.event === 'subscription.cancelled' ? 'cancelled' : 'halted' });
        });
        await batch.commit();
      }
    }

    // Handle Successful Subscription Charge (Renewal)
    if (event.event === 'subscription.charged') {
      const subscriptionId = event.payload.subscription.entity.id;
      const payment = event.payload.payment.entity;
      
      // Ensure the license is active
      const licensesSnapshot = await adminDb.collection('licenses')
        .where('subscriptionId', '==', subscriptionId)
        .get();

      if (!licensesSnapshot.empty) {
        const batch = adminDb.batch();
        licensesSnapshot.docs.forEach((doc: any) => {
          // Keep it active and record latest payment
          batch.update(doc.ref, { 
            status: 'active',
            lastPaymentId: payment.id,
            lastRenewedAt: new Date()
          });
        });
        await batch.commit();
        console.log(`Renewed/Activated ${licensesSnapshot.size} licenses for subscription ${subscriptionId}`);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
