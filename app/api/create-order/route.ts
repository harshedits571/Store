import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
  try {
    const { amount, currency = "INR" } = await request.json();

    const instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit
      currency: currency,
      receipt: "receipt_order_" + Date.now(),
    };

    const order = await instance.orders.create(options);
    
    if (!order) return NextResponse.json({ error: "Some error occured" }, { status: 500 });
    return NextResponse.json(order);
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
