import { NextResponse } from 'next/server';
import { collection, doc, setDoc, addDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
      email, name, cart, amount, currency, 
      razorpay_payment_id, razorpay_order_id, razorpay_signature 
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
          const pSnap = await getDoc(doc(db, "products", pid));
          if (pSnap.exists()) {
            const pData = pSnap.data();
            
            purchasedItems.push({
              id: pid,
              name: pData.name || "Bundle Item",
              category: pData.category || "Bundle",
              price: 0,
              isBundleItem: true,
              bundleId: item.id
            });

            // Generate license for this specific bundle item if it's a plugin/script
            if (pData.requiresLicense !== false || ['Plugin', 'Script'].includes(pData.category)) {
              const licenseKey = generate16DigitKey();
              
              // Save specific license tied to the sub-product
              await setDoc(doc(db, 'licenses', licenseKey), {
                email,
                licenseKey,
                productId: pid,
                productName: pData.name,
                paymentId: razorpay_payment_id,
                status: 'active',
                machineId: null,
                createdAt: serverTimestamp()
              });

              await setDoc(doc(db, 'license_by_email', `${email}_${pid}`), {
                email,
                licenseKey,
                productId: pid,
                status: 'active'
              });

              generatedLicenses.push({ name: pData.name, key: licenseKey });
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
          
          await setDoc(doc(db, 'licenses', licenseKey), {
            email,
            licenseKey,
            productId: item.id,
            productName: item.name,
            paymentId: razorpay_payment_id,
            status: 'active',
            machineId: null,
            createdAt: serverTimestamp()
          });

          await setDoc(doc(db, 'license_by_email', `${email}_${item.id}`), {
            email,
            licenseKey,
            productId: item.id,
            status: 'active'
          });

          generatedLicenses.push({ name: item.name, key: licenseKey });
        }
      }
    }

    // Save Master Order to Leads
    const leadRef = await addDoc(collection(db, 'leads'), {
      email,
      name,
      amount,
      currency: currency || 'USD',
      items: purchasedItems,
      paymentId: razorpay_payment_id,
      status: 'verified',
      createdAt: serverTimestamp()
    });

    // ----------------------------------------------------------------------
    // CRM: Update Customer Profile
    // ----------------------------------------------------------------------
    const customerRef = doc(db, 'customers', email.toLowerCase());
    const customerSnap = await getDoc(customerRef);

    if (customerSnap.exists()) {
      await updateDoc(customerRef, {
        ordersCount: (customerSnap.data().ordersCount || 0) + 1,
        totalSpent: (customerSnap.data().totalSpent || 0) + Number(amount),
        lastOrderDate: serverTimestamp(),
        lastSeen: serverTimestamp(),
        name: name || customerSnap.data().name // update name if provided
      });
    } else {
      await setDoc(customerRef, {
        email: email.toLowerCase(),
        name: name || 'Unknown Customer',
        ordersCount: 1,
        totalSpent: Number(amount),
        firstOrderDate: serverTimestamp(),
        lastOrderDate: serverTimestamp(),
        lastSeen: serverTimestamp(),
        notes: "",
        city: "Unknown" // Placeholder for future geo tracking
      });
    }

    return NextResponse.json({ 
      success: true, 
      orderId: leadRef.id,
      licenses: generatedLicenses 
    });

  } catch (error: any) {
    console.error("Error generating license:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
