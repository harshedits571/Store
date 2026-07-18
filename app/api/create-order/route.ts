import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { amount: clientAmount, currency = "INR", email, name, phone, cart, customLinkCode } = await request.json();

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
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

    // 1. Calculate actual server-side price
    let calculatedAmount = 0;
    const purchasedItems = [];

    // Check if it's the bundle
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
      // Regular products
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
            versionId: item.versionId || null,
            versionName: item.versionName || null
          });
        }
      }
    }

    // Fallback: If calculation fails, do not trust client. But for safety, we must have a positive amount.
    if (calculatedAmount <= 0) {
       return NextResponse.json({ error: "Invalid cart amount" }, { status: 400 });
    }

    // 2. Create Razorpay order
    const instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    const options = {
      amount: Math.round(calculatedAmount * 100), // amount in smallest currency unit
      currency: currency,
      receipt: "receipt_order_" + Date.now(),
    };

    const order = await instance.orders.create(options);
    
    if (!order) return NextResponse.json({ error: "Some error occured" }, { status: 500 });
    
    // 3. Save interested lead to Firestore securely using Admin SDK
    let leadId = null;
    try {
      if (email) {
        const leadRef = await adminDb.collection('leads').add({
          email,
          name: name || 'Unknown Customer',
          phone: phone || '',
          amount: calculatedAmount,
          clientAmount: clientAmount, // for auditing
          currency,
          items: purchasedItems,
          status: 'interested',
          razorpay_order_id: order.id,
          customLinkCode: customLinkCode || null,
          createdAt: new Date()
        });
        leadId = leadRef.id;
      }
    } catch (e) {
      console.error("Error creating interested lead:", e);
    }

    return NextResponse.json({ ...order, leadId, calculatedAmount });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
