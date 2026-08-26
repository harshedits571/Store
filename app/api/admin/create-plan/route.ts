import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
  try {
    const { name, description, amount, currency = "INR", period = "monthly" } = await request.json();

    const parsedAmount = parseFloat(amount);
    if (!name || isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid price amount or missing product name. Please specify a valid price for the subscription." }, 
        { status: 400 }
      );
    }

    // Map common period names to valid Razorpay periods ('daily' | 'weekly' | 'monthly' | 'yearly')
    let validPeriod = (period || 'monthly').toLowerCase();
    if (validPeriod === 'month') validPeriod = 'monthly';
    if (validPeriod === 'year') validPeriod = 'yearly';
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(validPeriod)) {
      validPeriod = 'monthly';
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay API credentials (NEXT_PUBLIC_RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing from server configuration." }, 
        { status: 500 }
      );
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Clean and truncate description to max 250 plain text characters for Razorpay plan item description
    const plainDescription = (description || `Subscription for ${name}`)
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
    const safeDescription = plainDescription.substring(0, 250) || `Subscription for ${name}`;

    const plan = await instance.plans.create({
      period: validPeriod as any,
      interval: 1,
      item: {
        name: name.substring(0, 100),
        description: safeDescription,
        amount: Math.round(parsedAmount * 100), // amount in paise
        currency: currency,
      }
    });

    if (!plan || !plan.id) {
      return NextResponse.json({ error: "Failed to create Razorpay plan" }, { status: 500 });
    }

    return NextResponse.json({ planId: plan.id });
  } catch (error: any) {
    console.error("Error creating Razorpay plan:", error);

    let errorMessage = "Unknown error creating Razorpay plan";
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.error?.description) {
      errorMessage = error.error.description;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.description) {
      errorMessage = error.description;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
