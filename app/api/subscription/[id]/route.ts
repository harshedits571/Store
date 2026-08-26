import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const subscriptionId = resolvedParams.id;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
    }

    const instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    const subscription = await instance.subscriptions.fetch(subscriptionId);
    
    return NextResponse.json({ subscription });
  } catch (error: any) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
