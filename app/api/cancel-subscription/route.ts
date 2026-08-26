import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscriptionId, licenseKey } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
    }

    const instance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    // cancel_at_cycle_end: 1 ensures the user still gets access until the end of the period they paid for.
    const subscription = await instance.subscriptions.cancel(subscriptionId, true); // The second param true is for cancel_at_cycle_end according to razorpay node sdk
    
    // Note: The Razorpay Node SDK typings or implementation for cancel might vary slightly.
    // In `razorpay` node module, the `cancel` method signature is: cancel(subscriptionId, cancelAtCycleEnd)
    // So passing `true` for cancelAtCycleEnd should work perfectly.

    // Persist pending cancellation status so that UI stays up to date
    if (licenseKey) {
      await adminDb.collection('licenses').doc(licenseKey).set({
        pendingCancellation: true
      }, { merge: true }).catch((e: any) => console.error("Error updating license status:", e));
    }

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
