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

export async function POST(request: Request) {
  try {
    const { email, name, phone, cart, currency = "USD", customLinkCode } = await request.json();

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Calculate actual server-side price to verify it is exactly 0
    let calculatedAmount = 0;
    const purchasedItems = [];

    const hasBundle = cart.some((item: any) => item.id === 'bundle');
    
    if (hasBundle) {
      const settingsDoc = await adminDb.collection('settings').doc('homepage').get();
      const settings = settingsDoc.data();
      const bundlePrice = currency === 'INR' ? (settings?.bundleInrPrice || settings?.bundlePrice * 84) : (settings?.bundlePrice || 195);
      calculatedAmount += Number(bundlePrice);
      
      purchasedItems.push({
        id: 'bundle',
        name: settings?.bundleTitle || 'Premium Bundle',
        category: 'Bundle',
        price: Number(bundlePrice)
      });
    } else {
      for (const item of cart) {
        if (item.id === 'bundle') continue;
        const productDoc = await adminDb.collection('products').doc(item.id).get();
        if (productDoc.exists) {
          const productData = productDoc.data();
          let itemPrice = 0;
          if (currency === 'INR') {
            itemPrice = productData?.inrSalePrice || productData?.inrPrice || (productData?.salePrice || productData?.price) * 84;
          } else {
            itemPrice = productData?.salePrice || productData?.price || (productData?.inrSalePrice || productData?.inrPrice) / 84 || 0;
          }
          calculatedAmount += Number(itemPrice);
          purchasedItems.push({
            id: productDoc.id,
            name: productData?.name || item.name,
            category: productData?.category || item.category,
            price: Number(itemPrice),
            requiresLicense: productData?.requiresLicense
          });
        }
      }
    }

    // Apply custom link discount if valid
    if (customLinkCode) {
      const linkQuery = await adminDb.collection('custom_links').where('linkPath', '==', customLinkCode).get();
      if (!linkQuery.empty) {
        const linkData = linkQuery.docs[0].data();
        if (!linkData.paused && (linkData.limit === 0 || linkData.claims < linkData.limit)) {
          const appliesToAll = !linkData.productId;
          const appliesToBundle = linkData.productId === 'bundle' && hasBundle;
          const appliesToItem = !hasBundle && cart.some((i: any) => i.id === linkData.productId);

          if (appliesToAll || appliesToBundle || appliesToItem) {
            if (linkData.discountType === 'percentage') {
              calculatedAmount = calculatedAmount - (calculatedAmount * (linkData.discountValue / 100));
            } else if (linkData.discountType === 'fixed') {
              const discount = currency === 'INR' ? linkData.discountValue * 84 : linkData.discountValue;
              calculatedAmount = Math.max(0, calculatedAmount - discount);
            }
          }
        }
      }
    }

    // 2. Verify it is actually free
    if (calculatedAmount > 0) {
      return NextResponse.json({ error: "Cart total is not free. Please use the standard checkout." }, { status: 400 });
    }

    // 3. Generate Licenses
    const generatedLicenses: any[] = [];
    const finalItems = [];

    for (const item of cart) {
      if (item.id === 'bundle' && item.productIds) {
        for (const pid of item.productIds) {
          const pSnap = await adminDb.collection("products").doc(pid).get();
          if (pSnap.exists) {
            const pData = pSnap.data();
            finalItems.push({
              id: pid,
              name: pData?.name || "Bundle Item",
              category: pData?.category || "Bundle",
              price: 0,
              isBundleItem: true,
              bundleId: item.id
            });

            if (pData?.requiresLicense !== false || ['Plugin', 'Script'].includes(pData?.category)) {
              const licenseKey = generate16DigitKey();
              await adminDb.collection('licenses').doc(licenseKey).set({
                email,
                licenseKey,
                productId: pid,
                productName: pData?.name,
                paymentId: 'free',
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
        finalItems.push({ id: item.id, name: item.name, category: item.category, price: 0 });
      } else {
        const pData = purchasedItems.find(p => p.id === item.id);
        finalItems.push({ id: item.id, name: item.name, category: item.category, price: 0 });

        if (pData?.requiresLicense !== false || ['Plugin', 'Script'].includes(item.category)) {
          const licenseKey = generate16DigitKey();
          await adminDb.collection('licenses').doc(licenseKey).set({
            email,
            licenseKey,
            productId: item.id,
            productName: item.name,
            paymentId: 'free',
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

    // 4. Save Master Order (verified lead)
    const newLeadRef = await adminDb.collection('leads').add({
      email,
      name: name || 'Unknown Customer',
      phone: phone || '',
      amount: 0,
      currency: currency || 'USD',
      items: finalItems,
      paymentId: 'free',
      status: 'verified',
      customLinkCode: customLinkCode || null,
      createdAt: FieldValue.serverTimestamp(),
      verifiedAt: FieldValue.serverTimestamp()
    });

    // 5. Update CRM
    const customerRef = adminDb.collection('customers').doc(email.toLowerCase());
    await customerRef.set({
      email: email.toLowerCase(),
      ordersCount: FieldValue.increment(1),
      totalSpent: FieldValue.increment(0),
      lastOrderDate: FieldValue.serverTimestamp(),
      lastSeen: FieldValue.serverTimestamp()
    }, { merge: true }).catch((e: any) => console.error("Error updating CRM:", e));

    if (name) {
      await customerRef.set({ name }, { merge: true }).catch(() => {});
    }

    // 6. Track Custom Link Claims
    if (customLinkCode) {
      const linkRef = adminDb.collection('custom_links').doc(customLinkCode);
      await linkRef.set({
        claims: FieldValue.increment(1)
      }, { merge: true }).catch((e: any) => console.error("Error updating link:", e));
    }

    return NextResponse.json({ 
      success: true, 
      orderId: newLeadRef.id,
      licenses: generatedLicenses 
    });

  } catch (error: any) {
    console.error("Error generating free order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
