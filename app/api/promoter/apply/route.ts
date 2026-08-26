import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      platform,
      channelUrl,
      handle,
      audienceSize,
      niche,
      portfolioLink,
      pitch,
      expectedTurnaroundDays,
      userId
    } = body;

    if (!name || !email || !channelUrl) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and channel URL are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Save to promoter_applications using adminDb (unrestricted server access)
    const appRef = await adminDb.collection('promoter_applications').add({
      userId: userId || null,
      name: name.trim(),
      email: cleanEmail,
      platform: platform || 'YouTube',
      channelUrl: channelUrl.trim(),
      handle: handle?.trim() || '',
      audienceSize: audienceSize || '1k-10k',
      niche: niche?.trim() || 'Video Editing / VFX',
      portfolioLink: portfolioLink?.trim() || '',
      pitch: pitch?.trim() || '',
      expectedTurnaroundDays: parseInt(expectedTurnaroundDays, 10) || 7,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: appRef.id });
  } catch (error: any) {
    console.error('Error in /api/promoter/apply:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error while submitting application' },
      { status: 500 }
    );
  }
}
