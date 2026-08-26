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

    // Helper to calculate exact price matching CurrencyContext
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

    // Fetch custom link data if provided
    let linkData: any = null;
    if (customLinkCode) {
      const cleanCode = customLinkCode.toUpperCase();
      const linkDoc = await adminDb.collection('custom_links').doc(cleanCode).get();
      if (linkDoc.exists) {
        const data = linkDoc.data();
        if (data?.active && (data?.maxRedemptions === 0 || (data?.currentRedemptions || 0) < (data?.maxRedemptions || 0))) {
          linkData = data;
        }
      }
    }

    const applyLinkDiscount = (productId: string, currentPrice: number) => {
      if (!linkData) return currentPrice;
      if (linkData.products && linkData.products.length > 0 && !linkData.products.includes(productId)) {
        return currentPrice;
      }
      if (linkData.pricingMode === 'discount') {
        return currentPrice * (1 - ((linkData.discountPercent || 0) / 100));
      } else if (linkData.pricingMode === 'fixed') {
        const fixed = linkData.fixedPrices?.[productId];
        if (fixed) {
          return currency === 'INR' ? (fixed.inr || 0) : (fixed.usd || 0);
        }
      }
      return currentPrice;
    };

    // Check if user has already redeemed custom link for any product in cart
    if (customLinkCode) {
      const cleanCode = customLinkCode.toUpperCase();
      const cleanEmail = email.toLowerCase().trim();
      for (const item of cart) {
        const uniqueProductId = item.versionId ? `${item.id}_${item.versionId}` : item.id;
        const redemptionDoc = await adminDb.collection('custom_link_redemptions')
          .doc(`${cleanEmail}_${cleanCode}_${uniqueProductId}`)
          .get();

        if (redemptionDoc.exists) {
          return NextResponse.json({ 
            error: `You have already redeemed code '${cleanCode}' for ${item.name || 'this product'}. This discount link can only be used once per product.` 
          }, { status: 400 });
        }
      }
    }

    // 1. Calculate actual server-side price to verify it is exactly 0
    let calculatedAmount = 0;
    const purchasedItems = [];

    const hasBundle = cart.some((item: any) => item.id === 'bundle');
    
    if (hasBundle) {
      const settingsDoc = await adminDb.collection('settings').doc('homepage').get();
      const settings = settingsDoc.data();
      let bundlePrice = currency === 'INR' ? (settings?.bundleInrPrice || settings?.bundlePrice * 84) : (settings?.bundlePrice || 195);
      
      bundlePrice = applyLinkDiscount('bundle', Number(bundlePrice));
      calculatedAmount += bundlePrice;
      
      purchasedItems.push({
        id: 'bundle',
        name: settings?.bundleTitle || 'Premium Bundle',
        category: 'Bundle',
        price: bundlePrice
      });
    } else {
      for (const item of cart) {
        if (item.id === 'bundle') continue;
        const productDoc = await adminDb.collection('products').doc(item.id).get();
        if (productDoc.exists) {
          const productData = productDoc.data();
          let targetData = productData;
          if (productData?.hasVersions && item.versionId && productData.versions) {
            const variant = productData.versions.find((v: any) => v.id === item.versionId);
            if (variant) {
              targetData = variant;
            }
          }
          
          if (targetData?.stockStatus === 'out_of_stock') {
            return NextResponse.json({ error: `Product ${productData?.name} ${item.versionName ? `(${item.versionName})` : ''} is currently out of stock.` }, { status: 400 });
          }
          
          let itemPrice = getActualPrice(targetData, currency);
          
          itemPrice = applyLinkDiscount(productDoc.id, itemPrice);
          calculatedAmount += itemPrice;
          
          purchasedItems.push({
            id: productDoc.id,
            name: productData?.name || item.name,
            category: productData?.category || item.category,
            price: itemPrice,
            requiresLicense: productData?.requiresLicense,
            versionId: item.versionId || null,
            versionName: item.versionName || null
          });
        }
      }
    }

    // 2. Verify it is actually free
    if (calculatedAmount > 0) {
      return NextResponse.json({ error: "Cart total is not free. Please use the standard checkout." }, { status: 400 });
    }

    // 3. Pre-generate Lead Reference ID for order tracking
    const newLeadRef = adminDb.collection('leads').doc();
    const orderId = newLeadRef.id;

    // 4. Generate Licenses
    const generatedLicenses: any[] = [];
    const finalItems = [];

    for (const item of cart) {
      const isBundle = item.id === 'bundle';
      let bundleProductIds = item.productIds;

      if (isBundle && (!bundleProductIds || !Array.isArray(bundleProductIds) || bundleProductIds.length === 0)) {
        try {
          const settingsDoc = await adminDb.collection('settings').doc('homepage').get();
          if (settingsDoc.exists) {
            bundleProductIds = settingsDoc.data()?.bundleProductIds || [];
          }
        } catch (e) {
          console.error("Error fetching homepage settings for bundle in claim-free:", e);
        }
      }

      if (isBundle && bundleProductIds && bundleProductIds.length > 0) {
        for (const pid of bundleProductIds) {
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

            if (pData?.requiresLicense !== false) {
              const licenseKey = generate16DigitKey();
              await adminDb.collection('licenses').doc(licenseKey).set({
                email,
                licenseKey,
                productId: pid,
                productName: pData?.name,
                paymentId: `free_${orderId}`,
                orderId: orderId,
                status: 'active',
                machineId: null,
                createdAt: FieldValue.serverTimestamp()
              });
              await adminDb.collection('license_by_email').doc(`${email}_${pid}`).set({
                email,
                licenseKey,
                productId: pid,
                orderId: orderId,
                status: 'active'
              });
              generatedLicenses.push({ name: pData?.name, key: licenseKey });
            }
          }
        }
        finalItems.push({ id: item.id, name: item.name, category: item.category, price: 0 });
      } else {
        const productDoc = await adminDb.collection('products').doc(item.id).get();
        const pData = productDoc.exists ? productDoc.data() : null;
        const productRequiresLicense = pData ? (pData.requiresLicense !== false) : (item.requiresLicense !== false);

        const uniqueProductId = item.versionId ? `${item.id}_${item.versionId}` : item.id;
        const uniqueProductName = item.versionName ? `${item.name} (${item.versionName})` : item.name;

        finalItems.push({ 
          id: item.id, 
          name: item.name, 
          category: item.category, 
          price: 0,
          versionId: item.versionId || null,
          versionName: item.versionName || null
        });

        if (productRequiresLicense) {
          const licenseKey = generate16DigitKey();
          await adminDb.collection('licenses').doc(licenseKey).set({
            email,
            licenseKey,
            productId: uniqueProductId,
            productName: uniqueProductName,
            paymentId: `free_${orderId}`,
            orderId: orderId,
            status: 'active',
            machineId: null,
            createdAt: FieldValue.serverTimestamp()
          });
          await adminDb.collection('license_by_email').doc(`${email}_${uniqueProductId}`).set({
            email,
            licenseKey,
            productId: uniqueProductId,
            orderId: orderId,
            status: 'active'
          });
          generatedLicenses.push({ name: uniqueProductName, key: licenseKey });
        }
      }
    }

    // 5. Save Master Order (verified lead)
    await newLeadRef.set({
      email,
      name: name || 'Unknown Customer',
      phone: phone || '',
      amount: 0,
      currency: currency || 'USD',
      items: finalItems,
      paymentId: `free_${orderId}`,
      status: 'verified',
      customLinkCode: customLinkCode || null,
      createdAt: FieldValue.serverTimestamp(),
      verifiedAt: FieldValue.serverTimestamp()
    });

    // 5.5. Update Product Sales Stats
    for (const item of finalItems) {
      if (item.id === 'bundle' || item.isBundleItem) continue;
      await adminDb.collection('products').doc(item.id).set({
        sales: FieldValue.increment(1)
      }, { merge: true }).catch(() => {});
    }

    // 6. Update CRM
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

    // 7. Track Custom Link Claims & Record Per-Product Redemption
    if (customLinkCode) {
      const cleanCode = customLinkCode.toUpperCase();
      const cleanEmail = email.toLowerCase().trim();

      const linkRef = adminDb.collection('custom_links').doc(cleanCode);
      await linkRef.set({
        claims: FieldValue.increment(1),
        currentRedemptions: FieldValue.increment(1)
      }, { merge: true }).catch((e: any) => console.error("Error updating link:", e));

      for (const item of cart) {
        const uniqueProductId = item.versionId ? `${item.id}_${item.versionId}` : item.id;
        await adminDb.collection('custom_link_redemptions')
          .doc(`${cleanEmail}_${cleanCode}_${uniqueProductId}`)
          .set({
            email: cleanEmail,
            customLinkCode: cleanCode,
            productId: uniqueProductId,
            orderId: orderId,
            redeemedAt: FieldValue.serverTimestamp()
          }).catch((e: any) => console.error("Error saving redemption:", e));
      }
    }

    return NextResponse.json({ 
      success: true, 
      orderId: orderId,
      licenses: generatedLicenses 
    });

  } catch (error: any) {
    console.error("Error generating free order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
