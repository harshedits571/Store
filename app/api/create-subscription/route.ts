import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { email, name, phone, planId, productId, amount, currency, customLinkCode } = await request.json();

    if (!planId) {
      return NextResponse.json({ error: "Missing Plan ID for subscription" }, { status: 400 });
    }

    const instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    const subscription = await instance.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 120, // max 10 years (120 months)
    });

    if (!subscription) {
      return NextResponse.json({ error: "Some error occurred while creating subscription" }, { status: 500 });
    }

    // Save lead as 'interested'
    let leadId = null;
    try {
      if (email) {
        const leadRef = await adminDb.collection('leads').add({
          email,
          name: name || 'Unknown Customer',
          phone: phone || '',
          amount: amount, // initial amount
          currency,
          items: [{ id: productId }],
          status: 'interested',
          isSubscription: true,
          razorpay_subscription_id: subscription.id,
          customLinkCode: customLinkCode || null,
          createdAt: new Date()
        });
        leadId = leadRef.id;
      }
    } catch (e) {
      console.error("Error creating interested lead for subscription:", e);
    }

    return NextResponse.json({ subscription_id: subscription.id, leadId });
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
