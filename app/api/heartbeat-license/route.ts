import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// CORS headers — extension runs from file:// or localhost
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

/**
 * POST /api/heartbeat-license
 *
 * Extension calls this every 5 minutes in the background.
 * Checks if license is still active and updates lastSeen per device.
 *
 * Body: { licenseKey, email, deviceId }
 * Response: { valid: boolean, status: string, message?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, email, deviceId } = body;

    if (!licenseKey || !email) {
      return NextResponse.json(
        { valid: false, status: 'error', message: 'Missing licenseKey or email.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const cleanKey = licenseKey.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();

    // ── 1. Find the license in Firestore ─────────────────────────────────────
    let licenseDocId: string | null = null;
    let licenseData: any = null;

    if (adminDb) {
      try {
        // Try direct doc ID
        let snap = await adminDb.collection('licenses').doc(cleanKey).get();
        if (snap.exists) {
          licenseDocId = snap.id;
          licenseData = snap.data();
        } else {
          // Query by licenseKey field
          const qSnap = await adminDb
            .collection('licenses')
            .where('licenseKey', '==', cleanKey)
            .get();
          if (!qSnap.empty) {
            licenseDocId = qSnap.docs[0].id;
            licenseData = qSnap.docs[0].data();
          }
        }
      } catch (err) {
        console.warn('adminDb heartbeat lookup error:', err);
      }
    }

    // Fallback to client SDK
    if (!licenseData) {
      try {
        const q = query(collection(db, 'licenses'), where('licenseKey', '==', cleanKey));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          licenseDocId = qSnap.docs[0].id;
          licenseData = qSnap.docs[0].data();
        }
      } catch (err) {
        console.warn('clientDb heartbeat lookup error:', err);
      }
    }

    // ── 2. License not found ──────────────────────────────────────────────────
    if (!licenseData || !licenseDocId) {
      return NextResponse.json(
        { valid: false, status: 'invalid', message: 'License key not found.' },
        { headers: corsHeaders() }
      );
    }

    // ── 3. Email mismatch ─────────────────────────────────────────────────────
    if (licenseData.email && licenseData.email.toLowerCase().trim() !== cleanEmail) {
      return NextResponse.json(
        { valid: false, status: 'email_mismatch', message: 'Email does not match this license.' },
        { headers: corsHeaders() }
      );
    }

    // ── 4. BLOCKED — admin suspended this license ─────────────────────────────
    if (licenseData.status === 'blocked') {
      return NextResponse.json(
        {
          valid: false,
          status: 'blocked',
          message: 'This license has been suspended by the administrator. Please contact support.',
        },
        { headers: corsHeaders() }
      );
    }

    // ── 5. Expired / Cancelled ────────────────────────────────────────────────
    const expiredStatuses = ['expired', 'cancelled', 'unpaid', 'inactive', 'halted'];
    if (expiredStatuses.includes(licenseData.status)) {
      return NextResponse.json(
        {
          valid: false,
          status: licenseData.status,
          message: 'Your subscription has expired. Please renew to continue.',
        },
        { headers: corsHeaders() }
      );
    }

    // Check expiresAt date
    if (licenseData.expiresAt) {
      const expMs =
        licenseData.expiresAt.seconds
          ? licenseData.expiresAt.seconds * 1000
          : new Date(licenseData.expiresAt).getTime();
      if (expMs < Date.now()) {
        return NextResponse.json(
          { valid: false, status: 'expired', message: 'Your license has expired. Please renew.' },
          { headers: corsHeaders() }
        );
      }
    }

    // ── 6. Device check — if admin removed this device, kick it out ───────────
    if (deviceId) {
      const devices: any[] = licenseData.devices || [];
      const deviceIndex = devices.findIndex((d: any) => d.id === deviceId);

      if (deviceIndex === -1) {
        // Device was removed by admin remotely
        return NextResponse.json(
          {
            valid: false,
            status: 'device_unbound',
            message: 'This device has been logged out remotely by the administrator. Please activate again.',
          },
          { headers: corsHeaders() }
        );
      }

      // ── 7. Update lastSeen for this device ─────────────────────────────────
      const updatedDevices = devices.map((d: any) =>
        d.id === deviceId ? { ...d, lastSeen: now } : d
      );

      try {
        if (adminDb) {
          await adminDb.collection('licenses').doc(licenseDocId).update({ devices: updatedDevices });
        } else {
          await updateDoc(doc(db, 'licenses', licenseDocId), { devices: updatedDevices });
        }
      } catch (updateErr) {
        console.warn('Failed to update lastSeen:', updateErr);
        // Non-fatal — still return valid
      }
    }

    // ── 8. All checks passed — license is active ──────────────────────────────
    return NextResponse.json(
      {
        valid: true,
        status: 'active',
        message: 'License is active.',
        license: {
          productName: licenseData.productName || 'Unknown Product',
          type: licenseData.type || 'lifetime',
          expiresAt: licenseData.expiresAt
            ? licenseData.expiresAt.seconds
              ? new Date(licenseData.expiresAt.seconds * 1000).toISOString()
              : licenseData.expiresAt
            : null,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Heartbeat endpoint error:', error);
    return NextResponse.json(
      { valid: false, status: 'server_error', message: 'License server error: ' + (error?.message || String(error)) },
      { status: 500, headers: corsHeaders() }
    );
  }
}
