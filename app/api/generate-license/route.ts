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
    if (!razorpay_payment_id || !razorpay_signature) {
       return NextResponse.json({ success: false, error: "Missing payment details." }, { status: 400 });
    }

    if (!razorpay_order_id && !body.razorpay_subscription_id) {
       return NextResponse.json({ success: false, error: "Missing order or subscription ID." }, { status: 400 });
    }

    let payload = "";
    if (body.razorpay_subscription_id) {
      payload = razorpay_payment_id + "|" + body.razorpay_subscription_id;
    } else {
      payload = razorpay_order_id + "|" + razorpay_payment_id;
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(payload)
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
        if (item.inrSalePrice !== undefined && item.inrSalePrice !== null && Number(item.inrSalePrice) >= 0) return Number(item.inrSalePrice);
        if (item.inrPrice !== undefined && item.inrPrice !== null && Number(item.inrPrice) >= 0) return Number(item.inrPrice);
        if (item.salePrice !== undefined && item.salePrice !== null && Number(item.salePrice) >= 0) return Number(item.salePrice) * 84;
        return (Number(item.price) || 0) * 84;
      }
      if (item.salePrice !== undefined && item.salePrice !== null && Number(item.salePrice) >= 0) return Number(item.salePrice);
      if (item.price !== undefined && item.price !== null && Number(item.price) >= 0) return Number(item.price);
      return 0;
    };

    // Pre-determine Lead Order ID for license binding
    let targetOrderId = body.leadRefId || orderId;
    if (!targetOrderId) {
      const newLeadDoc = adminDb.collection('leads').doc();
      targetOrderId = newLeadDoc.id;
    }

    // Loop through cart items to generate licenses
    for (const item of cart) {
      const actualPrice = getActualPrice(item, currency);

      // Track Sales & Revenue per Product
      if (item.id && item.id !== 'bundle') {
        await adminDb.collection('products').doc(item.id).set({
          sales: FieldValue.increment(1),
          revenueINR: FieldValue.increment(currency === 'INR' ? actualPrice : 0),
          revenueUSD: FieldValue.increment(currency === 'USD' ? actualPrice : 0)
        }, { merge: true }).catch((e: any) => console.error("Error updating product stats:", e));
      }

      const isBundle = item.id === 'bundle';
      let bundleProductIds = item.productIds;

      if (isBundle && (!bundleProductIds || !Array.isArray(bundleProductIds) || bundleProductIds.length === 0)) {
        try {
          const settingsDoc = await adminDb.collection('settings').doc('homepage').get();
          if (settingsDoc.exists) {
            bundleProductIds = settingsDoc.data()?.bundleProductIds || [];
          }
        } catch (e) {
          console.error("Error fetching homepage settings for bundle:", e);
        }
      }

      if (isBundle && bundleProductIds && bundleProductIds.length > 0) {
        // Expand bundle into individual product access records
        for (const pid of bundleProductIds) {
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

            // Generate license for this specific bundle item unless requiresLicense is explicitly false
            if (pData?.requiresLicense !== false) {
              const licenseKey = generate16DigitKey();
              
              // Save specific license tied to the sub-product
              await adminDb.collection('licenses').doc(licenseKey).set({
                email,
                licenseKey,
                productId: pid,
                productName: pData?.name,
                paymentId: razorpay_payment_id,
                orderId: targetOrderId,
                subscriptionId: body.razorpay_subscription_id || null,
                isSubscription: !!body.razorpay_subscription_id,
                status: 'active',
                machineId: null,
                createdAt: FieldValue.serverTimestamp()
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
        const uniqueProductId = item.versionId ? `${item.id}_${item.versionId}` : item.id;
        const uniqueProductName = item.versionName ? `${item.name} (${item.versionName})` : item.name;

        purchasedItems.push({
          id: item.id,
          name: item.name,
          category: item.category,
          price: actualPrice,
          versionId: item.versionId || null,
          versionName: item.versionName || null
        });

        // Fetch product from DB to check requiresLicense accurately
        const pSnap = await adminDb.collection("products").doc(item.id).get();
        const pData = pSnap.exists ? pSnap.data() : null;

        // Check if product requires license (defaults to true unless explicitly false)
        const productRequiresLicense = pData ? (pData.requiresLicense !== false) : (item.requiresLicense !== false);

        // Generate or renew license if required
        if (productRequiresLicense) {
          // Check if customer already has a license for this product to keep the same key on renewal
          const existingLicSnap = await adminDb.collection('licenses')
            .where('email', '==', email)
            .where('productId', '==', uniqueProductId)
            .get();

          let licenseKey = '';
          if (!existingLicSnap.empty) {
            // Reuse existing license key so customer doesn't have to re-enter key in After Effects!
            const existingDoc = existingLicSnap.docs[0];
            licenseKey = existingDoc.id;
            await existingDoc.ref.update({
              paymentId: razorpay_payment_id,
              orderId: targetOrderId,
              subscriptionId: body.razorpay_subscription_id || null,
              isSubscription: !!body.razorpay_subscription_id,
              status: 'active',
              expiresAt: null,
              lastRenewedAt: FieldValue.serverTimestamp()
            });
          } else {
            // Generate new license key for new purchases
            licenseKey = generate16DigitKey();
            await adminDb.collection('licenses').doc(licenseKey).set({
              email,
              licenseKey,
              productId: uniqueProductId,
              productName: uniqueProductName,
              paymentId: razorpay_payment_id,
              orderId: targetOrderId,
              subscriptionId: body.razorpay_subscription_id || null,
              isSubscription: !!body.razorpay_subscription_id,
              status: 'active',
              machineId: null,
              createdAt: FieldValue.serverTimestamp()
            });
          }

          generatedLicenses.push({ name: uniqueProductName, key: licenseKey });
        }
      }
    }

    // Save Master Order to Leads
    const leadDocRef = adminDb.collection('leads').doc(targetOrderId);
    const existingLead = await leadDocRef.get();
    if (existingLead.exists) {
      await leadDocRef.update({
        items: purchasedItems,
        paymentId: razorpay_payment_id,
        status: 'verified',
        verifiedAt: FieldValue.serverTimestamp()
      });
    } else {
      await leadDocRef.set({
        email,
        name: name || 'Customer',
        amount,
        currency: currency || 'USD',
        items: purchasedItems,
        paymentId: razorpay_payment_id,
        status: 'verified',
        customLinkCode: customLinkCode || null,
        createdAt: FieldValue.serverTimestamp(),
        verifiedAt: FieldValue.serverTimestamp()
      });
    }

    // ----------------------------------------------------------------------
    // CRM: Update Customer Profile
    // ----------------------------------------------------------------------
    const customerRef = adminDb.collection('customers').doc(email.toLowerCase());
    await customerRef.set({
      email: email.toLowerCase(),
      ordersCount: FieldValue.increment(1),
      totalSpent: FieldValue.increment(Number(amount)),
      lastOrderDate: FieldValue.serverTimestamp(),
      lastSeen: FieldValue.serverTimestamp()
    }, { merge: true }).catch((e: any) => console.error("Error updating customer profile:", e));
    
    if (name) {
      await customerRef.set({ name }, { merge: true }).catch(() => {});
    }

    // ----------------------------------------------------------------------
    // Custom Links & Promoter Commission Tracking
    // ----------------------------------------------------------------------
    if (customLinkCode) {
      const cleanCode = customLinkCode.toUpperCase();
      const cleanEmail = email.toLowerCase().trim();

      const linkRef = adminDb.collection('custom_links').doc(cleanCode);
      const linkDoc = await linkRef.get().catch(() => null);

      await linkRef.set({
        claims: FieldValue.increment(1),
        currentRedemptions: FieldValue.increment(1),
        totalSalesINR: FieldValue.increment(currency === 'INR' ? Number(amount) : 0),
        totalSalesUSD: FieldValue.increment(currency === 'USD' ? Number(amount) : 0)
      }, { merge: true }).catch((e: any) => console.error("Error updating custom link:", e));

      for (const item of cart) {
        const uniqueProductId = item.versionId ? `${item.id}_${item.versionId}` : item.id;
        await adminDb.collection('custom_link_redemptions')
          .doc(`${cleanEmail}_${cleanCode}_${uniqueProductId}`)
          .set({
            email: cleanEmail,
            customLinkCode: cleanCode,
            productId: uniqueProductId,
            orderId: targetOrderId,
            redeemedAt: FieldValue.serverTimestamp()
          }).catch((e: any) => console.error("Error saving redemption:", e));
      }

      // Record Promoter Commission if link belongs to a promoter
      try {
        if (!promoterEmail) {
          const promSnap = await adminDb.collection('promoters').where('referralCode', '==', cleanCode).get();
          if (!promSnap.empty) {
            promoterEmail = promSnap.docs[0].data()?.email || promSnap.docs[0].id;
          } else {
            const allPromSnap = await adminDb.collection('promoters').get();
            for (const pDoc of allPromSnap.docs) {
              const pData = pDoc.data();
              const derivedCode = (pDoc.id.split('@')[0] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
              if (derivedCode === cleanCode || pData.referralCode?.toUpperCase() === cleanCode) {
                promoterEmail = pData.email || pDoc.id;
                break;
              }
            }
          }
        }

        if (promoterEmail) {
          const promoterSnap = await adminDb.collection('promoters').doc(promoterEmail.toLowerCase()).get();
          const promoterData = promoterSnap.exists ? promoterSnap.data() : null;

          const commRate = Number(promoterData?.commissionRate) || 20;
          const fixedComm = Number(promoterData?.fixedCommission) || 0;

          let commissionAmount = 0;
          if (fixedComm > 0) {
            commissionAmount = fixedComm * (cart.length || 1);
          } else {
            commissionAmount = Math.round((Number(amount) * (commRate / 100)) * 100) / 100;
          }

          await adminDb.collection('promoter_commissions').add({
            promoterEmail: promoterEmail.toLowerCase(),
            promoterName: promoterData?.name || 'Creator',
            referralCode: cleanCode,
            orderId: targetOrderId,
            customerEmail: cleanEmail,
            productName: purchasedItems.map(p => p.name).join(', ') || 'Extension',
            orderAmount: Number(amount),
            currency: currency || 'INR',
            commissionRate: commRate,
            commissionAmount: commissionAmount,
            status: 'pending',
            createdAt: new Date().toISOString(),
          });

          await adminDb.collection('promoters').doc(promoterEmail.toLowerCase()).set({
            totalEarned: FieldValue.increment(commissionAmount),
            pendingBalance: FieldValue.increment(commissionAmount),
            totalSalesCount: FieldValue.increment(1)
          }, { merge: true });
        }
      } catch (promErr) {
        console.error("Error recording promoter commission:", promErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      orderId: targetOrderId,
      licenses: generatedLicenses 
    });

  } catch (error: any) {
    console.error("Error generating license:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
