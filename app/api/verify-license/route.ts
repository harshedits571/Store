import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, licenseKey, machineId, productId } = body;

    if (!email || !licenseKey || !machineId || !productId) {
      return NextResponse.json({ status: 'error', message: 'Missing required parameters (email, licenseKey, machineId, productId)' }, { status: 400 });
    }

    // Lookup the license
    const licenseRef = doc(db, 'licenses', licenseKey);
    const docSnap = await getDoc(licenseRef);

    // 1. Check if Document Exists
    if (!docSnap.exists()) {
      return NextResponse.json({ status: 'error', message: 'Invalid License Key' }, { status: 404 });
    }

    const data = docSnap.data();

    // 2. Check Product Match (CRITICAL for preventing cross-product license usage)
    if (data.productId !== productId) {
      return NextResponse.json({ status: 'error', message: 'This License Key is for a different product.' }, { status: 403 });
    }

    // 3. Check Email Match
    if (data.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ status: 'error', message: 'Invalid License Key or Email mismatch' }, { status: 403 });
    }

    // 4. Check Status
    if (data.status !== 'active') {
      return NextResponse.json({ status: 'error', message: 'License is blocked or inactive' }, { status: 403 });
    }

    // 4. Hardware Binding (DRM)
    if (!data.machineId) {
      // First time activation! Bind the machine ID
      await updateDoc(licenseRef, {
        machineId: machineId
      });
      return NextResponse.json({ status: 'success', message: 'License verified and bound to this machine.', tier: data.tier });
    } else {
      // Already bound, verify machine ID
      if (data.machineId !== machineId) {
        return NextResponse.json({ status: 'error', message: 'License is already in use on another computer.' }, { status: 403 });
      } else {
        // Correct machine ID, verify success
        return NextResponse.json({ status: 'success', message: 'License verified successfully.', tier: data.tier });
      }
    }

  } catch (error: any) {
    console.error("Error verifying license:", error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}
