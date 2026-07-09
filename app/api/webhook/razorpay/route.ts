import { NextResponse } from 'next/server';
import crypto from 'crypto';
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

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // 1. Verify Signature
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not set in environment variables");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    // 2. Process "payment_link.paid" event
    if (event.event === 'payment_link.paid') {
      const paymentLinkEntity = event.payload.payment_link.entity;
      const leadId = paymentLinkEntity.reference_id;
      const paymentLinkId = paymentLinkEntity.id;
      // Depending on the payload, the actual payment_id might be inside payload.payment if it was included. 
      // If not, we fallback to the payment_link_id.
      const paymentId = event.payload?.payment?.entity?.id || paymentLinkId; 

      if (!leadId) {
         console.warn("Webhook received payment_link.paid but no reference_id was found.");
         return NextResponse.json({ success: true, message: 'Ignored: No reference_id (leadId)' });
      }

      // Load Lead to check if it's already processed
      const leadDoc = await adminDb.collection('leads').doc(leadId).get();
      if (!leadDoc.exists) {
        console.error(`Lead ${leadId} not found for webhook processing`);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const leadData = leadDoc.data();
      
      // IDEMPOTENCY: If already verified by the client-side redirect, skip processing!
      if (leadData?.status === 'verified') {
        console.log(`Lead ${leadId} was already verified. Webhook skipping.`);
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      const { email, name, items: cart, amount, currency, customLinkCode } = leadData as any;

      // 3. Generate Licenses (same logic as verify-payment-link)
      const generatedLicenses: any[] = [];
      const purchasedItems = [];

      for (const item of cart) {
        purchasedItems.push(item);

        if (item.isBundleItem) {
          const licenseKey = generate16DigitKey();
          await adminDb.collection('licenses').doc(licenseKey).set({
            email,
            licenseKey,
            productId: item.id,
            productName: item.name,
            paymentId: paymentId,
            status: 'active',
            machineId: null,
            createdAt: FieldValue.serverTimestamp()
          });

          await adminDb.collection('license_by_email').doc(`${email}_${item.id}`).set({
            email,
            licenseKey,
            productId: item.id,
            status: 'active'
          });

          generatedLicenses.push({ name: item.name, key: licenseKey });
        } else {
          if (item.category === 'Plugin' || item.category === 'Script' || item.category === 'Bundle') {
            const licenseKey = generate16DigitKey();
            
            await adminDb.collection('licenses').doc(licenseKey).set({
              email,
              licenseKey,
              productId: item.id,
              productName: item.name,
              paymentId: paymentId,
              status: 'active',
              machineId: null,
              createdAt: FieldValue.serverTimestamp()
            });

            await adminDb.collection('license_by_email').doc(`${email}_${item.id}`).set({
              email,
              licenseKey,
              productId: item.id,
              status: 'active'
            });

            generatedLicenses.push({ name: item.name, key: licenseKey });
          }
        }
      }

      // 4. Update Master Order
      await adminDb.collection('leads').doc(leadId).update({
        paymentId: paymentId,
        status: 'verified',
        verifiedAt: FieldValue.serverTimestamp(),
        verifiedBy: 'webhook' // helpful for debugging
      });

      // 5. CRM: Update Customer Profile
      const customerRef = adminDb.collection('customers').doc(email.toLowerCase());
      await customerRef.set({
        email: email.toLowerCase(),
        ordersCount: FieldValue.increment(1),
        totalSpent: FieldValue.increment(Number(amount)),
        lastOrderDate: FieldValue.serverTimestamp(),
        lastSeen: FieldValue.serverTimestamp()
      }, { merge: true }).catch(() => {});
      
      if (name) {
        await customerRef.set({ name }, { merge: true }).catch(() => {});
      }

      // 6. Custom Links Metrics
      if (customLinkCode) {
        const linkRef = adminDb.collection('custom_links').doc(customLinkCode);
        await linkRef.set({
          claims: FieldValue.increment(1),
          totalSalesINR: FieldValue.increment(currency === 'INR' ? Number(amount) : 0),
          totalSalesUSD: FieldValue.increment(currency === 'USD' ? Number(amount) : 0)
        }, { merge: true }).catch(() => {});
      }

      console.log(`Successfully processed webhook for lead: ${leadId}`);
      return NextResponse.json({ success: true, message: 'Licenses generated via webhook' });
    }

    // Ignore other events
    return NextResponse.json({ success: true, message: 'Event ignored' });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
