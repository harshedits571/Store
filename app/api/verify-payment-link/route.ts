import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

function generate16DigitKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key.match(/.{1,4}/g)?.join('-') || key;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const razorpay_payment_id = searchParams.get('razorpay_payment_id');
    const razorpay_payment_link_id = searchParams.get('razorpay_payment_link_id');
    const razorpay_payment_link_reference_id = searchParams.get('razorpay_payment_link_reference_id');
    const razorpay_payment_link_status = searchParams.get('razorpay_payment_link_status');
    const razorpay_signature = searchParams.get('razorpay_signature');
    const leadId = searchParams.get('leadId') || razorpay_payment_link_reference_id;

    if (!razorpay_payment_id || !razorpay_signature || !leadId) {
      return NextResponse.redirect(new URL('/?error=missing_payment_details', request.url));
    }

    if (razorpay_payment_link_status !== 'paid') {
      return NextResponse.redirect(new URL('/checkout?error=payment_failed_or_cancelled', request.url));
    }

    // Verify Signature
    const payload = razorpay_payment_link_id + "|" + razorpay_payment_link_reference_id + "|" + razorpay_payment_link_status + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
       return NextResponse.redirect(new URL('/checkout?error=invalid_signature', request.url));
    }

    // Load Lead to get Cart details
    const leadDoc = await adminDb.collection('leads').doc(leadId).get();
    if (!leadDoc.exists) {
      return NextResponse.redirect(new URL('/checkout?error=order_not_found', request.url));
    }

    const leadData = leadDoc.data();
    if (leadData?.status === 'verified') {
      // Already verified, just redirect to success
      return NextResponse.redirect(new URL(`/success?orderId=${leadId}`, request.url));
    }

    const { email, name, items: cart, amount, currency, customLinkCode } = leadData as any;

    // Generate Licenses & Record Order
    const generatedLicenses: any[] = [];
    const purchasedItems = [];

    // Bundle Logic handled previously, the items in leadData are flattened or we just need to generate keys for what requires it
    for (const item of cart) {
      purchasedItems.push(item);

      if (item.isBundleItem) {
        // Generate license for this specific bundle item
        const licenseKey = generate16DigitKey();
        await adminDb.collection('licenses').doc(licenseKey).set({
          email,
          licenseKey,
          productId: item.id,
          productName: item.name,
          paymentId: razorpay_payment_id,
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
        // Normal item
        if (item.category === 'Plugin' || item.category === 'Script' || item.category === 'Bundle') {
          const licenseKey = generate16DigitKey();
          
          await adminDb.collection('licenses').doc(licenseKey).set({
            email,
            licenseKey,
            productId: item.id,
            productName: item.name,
            paymentId: razorpay_payment_id,
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

    // Update Master Order
    await adminDb.collection('leads').doc(leadId).update({
      paymentId: razorpay_payment_id,
      status: 'verified',
      verifiedAt: FieldValue.serverTimestamp()
    });

    // CRM: Update Customer Profile
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

    // Custom Links
    if (customLinkCode) {
      const linkRef = adminDb.collection('custom_links').doc(customLinkCode);
      await linkRef.set({
        claims: FieldValue.increment(1),
        totalSalesINR: FieldValue.increment(currency === 'INR' ? Number(amount) : 0),
        totalSalesUSD: FieldValue.increment(currency === 'USD' ? Number(amount) : 0)
      }, { merge: true }).catch(() => {});
    }

    // Redirect to success page
    return NextResponse.redirect(new URL(`/success?orderId=${leadId}`, request.url));

  } catch (error: any) {
    console.error("Error verifying payment link:", error);
    return NextResponse.redirect(new URL('/checkout?error=server_error', request.url));
  }
}
