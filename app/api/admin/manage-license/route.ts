import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { licenseId, action, newStatus, deviceId, durationDays } = await req.json();

    if (!licenseId || !action) {
      return NextResponse.json({ success: false, error: 'Missing licenseId or action' }, { status: 400 });
    }

    if (action === 'remove_device') {
      let licenseData: any = null;
      if (adminDb) {
        const docSnap = await adminDb.collection('licenses').doc(licenseId).get();
        if (docSnap.exists) licenseData = docSnap.data();
      } else {
        const docSnap = await getDoc(doc(db, 'licenses', licenseId));
        if (docSnap.exists()) licenseData = docSnap.data();
      }

      if (licenseData) {
        const remainingDevices = (licenseData.devices || []).filter((d: any) => d.id !== deviceId);
        const newMachineId = remainingDevices.length > 0 ? (remainingDevices[0].name + ' (' + remainingDevices[0].id + ')') : null;
        const updateData = { machineId: newMachineId, devices: remainingDevices };

        if (adminDb) {
          await adminDb.collection('licenses').doc(licenseId).update(updateData);
        } else {
          await updateDoc(doc(db, 'licenses', licenseId), updateData);
        }
      }
      return NextResponse.json({ success: true, message: 'Device removed successfully.' });
    }

    let updateData: any = {};
    if (action === 'reset') {
      updateData = { machineId: null, devices: [] };
    } else if (action === 'block') {
      updateData = { status: newStatus || 'blocked' };
    } else if (action === 'unblock') {
      updateData = { status: 'active' };
    } else if (action === 'grant_access') {
      let expiresAtVal: any = null;
      if (durationDays && durationDays !== 'permanent') {
        const days = parseInt(durationDays, 10);
        if (!isNaN(days) && days > 0) {
          expiresAtVal = new Date(Date.now() + days * 86400000).toISOString();
        }
      }
      updateData = {
        status: 'active',
        expiresAt: expiresAtVal,
        freeGrantedAt: new Date().toISOString(),
        grantedDurationDays: durationDays
      };
    }

    if (adminDb) {
      await adminDb.collection('licenses').doc(licenseId).update(updateData);
    } else {
      await updateDoc(doc(db, 'licenses', licenseId), updateData);
    }

    return NextResponse.json({ success: true, message: `License ${action} completed.` });
  } catch (error: any) {
    console.error("Manage license admin route error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
