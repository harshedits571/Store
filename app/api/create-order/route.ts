import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { amount: clientAmount, currency = "INR", email, name, phone, cart, customLinkCode } = await request.json();

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 1. Calculate actual server-side price
    let calculatedAmount = 0;
    const purchasedItems = [];

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

    // Check if it's the bundle
    const hasBundle = cart.some(item => item.id === 'bundle');
    
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
      // Regular products
      for (const item of cart) {
        if (item.id === 'bundle') continue;
        const productDoc = await adminDb.collection('products').doc(item.id).get();
        if (productDoc.exists) {
          const productData = productDoc.data();
          const itemPrice = getActualPrice(productData, currency);
          calculatedAmount += Number(itemPrice);
          purchasedItems.push({
            id: productDoc.id,
            name: productData?.name || item.name,
            category: productData?.category || item.category,
            price: Number(itemPrice)
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
          // It's a valid link, check if it applies
          const appliesToAll = !linkData.productId;
          const appliesToBundle = linkData.productId === 'bundle' && hasBundle;
          const appliesToItem = !hasBundle && cart.some(i => i.id === linkData.productId);

          if (appliesToAll || appliesToBundle || appliesToItem) {
            if (linkData.discountType === 'percentage') {
              calculatedAmount = calculatedAmount - (calculatedAmount * (linkData.discountValue / 100));
            } else if (linkData.discountType === 'fixed') {
              // Assuming fixed discount is in USD, convert to INR if necessary (rough estimate 80)
              const discount = currency === 'INR' ? linkData.discountValue * 80 : linkData.discountValue;
              calculatedAmount = Math.max(0, calculatedAmount - discount);
            }
          }
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
