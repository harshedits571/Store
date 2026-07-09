import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

// Helper to generate 16 digit key
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
    const body = await request.json();
    const { 
      email, name, cart, amount, currency, orderId,
      razorpay_payment_id, razorpay_order_id, razorpay_signature,
      customLinkCode 
    } = body;

    // ----------------------------------------------------------------------
    // Razorpay Verification
    // ----------------------------------------------------------------------
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
       return NextResponse.json({ success: false, error: "Missing payment details." }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
       return NextResponse.json({ success: false, error: "Invalid payment signature." }, { status: 400 });
    }

    // ----------------------------------------------------------------------
    // Generate Licenses & Record Order
    // ----------------------------------------------------------------------
    
    const generatedLicenses: any[] = [];
    const purchasedItems = [];

    const getActualPrice = (item: any, curr: string) => {
      if (curr === 'INR') {
        return item.inrSalePrice ?? item.inrPrice ?? (item.price * 84);
      }
      return item.salePrice ?? item.price ?? 0;
    };

    // Loop through cart items to generate licenses
    for (const item of cart) {
      const actualPrice = getActualPrice(item, currency);
      if (item.id === 'bundle' && item.productIds) {
        // Expand bundle into individual product access records
        for (const pid of item.productIds) {
          const pSnap = await adminDb.collection("products").doc(pid).get();
          if (pSnap.exists) {
            const pData = pSnap.data();
            
            purchasedItems.push({
              id: pid,
              name: pData?.name || "Bundle Item",
              category: pData?.category || "Bundle",
              price: 0,
              isBundleItem: true,
              bundleId: item.id
            });

            // Generate license for this specific bundle item if it's a plugin/script
            if (pData?.requiresLicense !== false || ['Plugin', 'Script'].includes(pData?.category)) {
              const licenseKey = generate16DigitKey();
              
              // Save specific license tied to the sub-product
              await adminDb.collection('licenses').doc(licenseKey).set({
                email,
                licenseKey,
                productId: pid,
                productName: pData?.name,
                paymentId: razorpay_payment_id,
                status: 'active',
                machineId: null,
                createdAt: FieldValue.serverTimestamp()
              });

              await adminDb.collection('license_by_email').doc(`${email}_${pid}`).set({
                email,
                licenseKey,
                productId: pid,
                status: 'active'
              });

              generatedLicenses.push({ name: pData?.name, key: licenseKey });
            }
          }
        }
        
        // Add the parent bundle as a record for order tracking
        purchasedItems.push({
          id: item.id,
          name: item.name,
          category: item.category,
          price: actualPrice
        });

      } else {
        purchasedItems.push({
          id: item.id,
          name: item.name,
          category: item.category,
          price: actualPrice
        });

        // Force license generation for software categories even if local cart state was stale
        if (item.requiresLicense !== false || ['Plugin', 'Script', 'Bundle'].includes(item.category)) {
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

    // Save Master Order to Leads (Update if orderId provided, else create)
    let leadRefId = orderId;
    if (orderId) {
      await adminDb.collection('leads').doc(orderId).update({
        items: purchasedItems, // Refresh items just in case
        paymentId: razorpay_payment_id,
        status: 'verified',
        verifiedAt: FieldValue.serverTimestamp()
      });
    } else {
      const newLeadRef = await adminDb.collection('leads').add({
        email,
        name,
        amount,
        currency: currency || 'USD',
        items: purchasedItems,
        paymentId: razorpay_payment_id,
        status: 'verified',
        createdAt: FieldValue.serverTimestamp(),
        verifiedAt: FieldValue.serverTimestamp()
      });
      leadRefId = newLeadRef.id;
    }

    // ----------------------------------------------------------------------
    // CRM: Update Customer Profile
    // ----------------------------------------------------------------------
    const customerRef = adminDb.collection('customers').doc(email.toLowerCase());
    
    // Use setDoc with merge to avoid needing read permissions on the unauthenticated server
    await customerRef.set({
      email: email.toLowerCase(),
      ordersCount: FieldValue.increment(1),
      totalSpent: FieldValue.increment(Number(amount)),
      lastOrderDate: FieldValue.serverTimestamp(),
      lastSeen: FieldValue.serverTimestamp()
    }, { merge: true }).catch((e: any) => console.error("Error updating customer profile:", e));
    
    // If name is provided, update it too
    if (name) {
      await customerRef.set({ name }, { merge: true }).catch(() => {});
    }

    // ----------------------------------------------------------------------
    // Custom Links: Track Revenue and Redemptions
    // ----------------------------------------------------------------------
    if (customLinkCode) {
      const linkRef = adminDb.collection('custom_links').doc(customLinkCode);
      await linkRef.set({
        claims: FieldValue.increment(1),
        totalSalesINR: FieldValue.increment(currency === 'INR' ? Number(amount) : 0),
        totalSalesUSD: FieldValue.increment(currency === 'USD' ? Number(amount) : 0)
      }, { merge: true }).catch((e: any) => console.error("Error updating custom link:", e));
    }

    return NextResponse.json({ 
      success: true, 
      orderId: leadRefId,
      licenses: generatedLicenses 
    });

  } catch (error: any) {
    console.error("Error generating license:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
