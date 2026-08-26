import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';

const GUMROAD_PRODUCT_ID = "cCQvhGiqwipa_RpwJsdg9g==";
const MAX_DEVICES_PER_LICENSE = 2;

// CORS headers helper for Adobe CEP Extensions (which run from file:// or localhost)
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, email, extensionId, deviceId, deviceName } = body;

    if (!licenseKey || !email) {
      return NextResponse.json(
        { valid: false, error: 'missing_fields', message: 'License key and email are required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const cleanKey = licenseKey.trim();
    const upperKey = cleanKey.toUpperCase();
    const rawKeyNoDashes = upperKey.replace(/[^A-Z0-9]/g, '');
    const cleanEmail = email.trim().toLowerCase();

    // ════════════════════════════════════════════════════
    // 1. CHECK WEBSITE FIRESTORE LICENSES COLLECTION
    // ════════════════════════════════════════════════════
    let licenseDocId: string | null = null;
    let licenseData: any = null;

    // First try Firebase Admin SDK (unrestricted server access)
    if (adminDb) {
      try {
        // 1a. Direct Document ID lookup (Fast & Exact)
        let docSnap = await adminDb.collection('licenses').doc(cleanKey).get();
        if (!docSnap.exists && cleanKey !== upperKey) {
          docSnap = await adminDb.collection('licenses').doc(upperKey).get();
        }

        if (docSnap.exists) {
          licenseDocId = docSnap.id;
          licenseData = docSnap.data();
        } else {
          // 1b. Query where licenseKey field equals cleanKey or upperKey
          let snap = await adminDb.collection('licenses').where('licenseKey', '==', cleanKey).get();
          if (snap.empty && cleanKey !== upperKey) {
            snap = await adminDb.collection('licenses').where('licenseKey', '==', upperKey).get();
          }

          if (!snap.empty) {
            licenseDocId = snap.docs[0].id;
            licenseData = snap.docs[0].data();
          } else if (cleanEmail) {
            // 1c. Fallback by email match
            const emailSnap = await adminDb.collection('licenses').where('email', '==', cleanEmail).get();
            if (!emailSnap.empty) {
              const matchedDoc = emailSnap.docs.find((d: any) => {
                const k = (d.data().licenseKey || d.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                return k === rawKeyNoDashes || d.id === cleanKey || d.id === upperKey;
              });
              if (matchedDoc) {
                licenseDocId = matchedDoc.id;
                licenseData = matchedDoc.data();
              }
            }
          }
        }
      } catch (adminErr) {
        console.warn("adminDb lookup warning:", adminErr);
      }
    }

    // Fallback to client SDK if adminDb is not initialized
    if (!licenseData) {
      try {
        const licensesRef = collection(db, 'licenses');
        const q = query(licensesRef, where('licenseKey', '==', cleanKey));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          licenseDocId = docSnap.id;
          licenseData = docSnap.data();
        }
      } catch (clientErr) {
        console.warn("client db lookup warning:", clientErr);
      }
    }

    if (licenseData && licenseDocId) {
      // --- Deactivation Handler ---
      if (body.action === 'deactivate') {
        const remainingDevices = (licenseData.devices || []).filter((d: any) => d.id !== deviceId);
        const newMachineId = remainingDevices.length > 0 ? (remainingDevices[0].name + ' (' + remainingDevices[0].id + ')') : null;

        try {
          if (adminDb) {
            await adminDb.collection('licenses').doc(licenseDocId).update({
              machineId: newMachineId,
              devices: remainingDevices
            });
          } else {
            await updateDoc(doc(db, 'licenses', licenseDocId), {
              machineId: newMachineId,
              devices: remainingDevices
            });
          }
        } catch (e) {}

        return NextResponse.json(
          { success: true, message: 'Device deactivated successfully.' },
          { headers: corsHeaders() }
        );
      }

      // --- Check 1.1: Extension Product ID Binding ---
      // Dynamic matching: matches exact product ID, version ID, product name, or extension ID automatically
      const targetProductId = (licenseData.productId || '').trim().toLowerCase();
      const clientExtId = (extensionId || '').trim().toLowerCase();

      if (targetProductId && clientExtId) {
        const isMatch = 
          targetProductId === clientExtId ||
          targetProductId.includes(clientExtId) ||
          clientExtId.includes(targetProductId) ||
          (licenseData.productName && licenseData.productName.toLowerCase().includes(clientExtId)) ||
          (licenseData.productName && clientExtId.includes(licenseData.productName.toLowerCase())) ||
          clientExtId === 'd4r6mwesexiuudwwtcep' ||
          clientExtId === 'xlops' ||
          clientExtId === 'xlobs';

        if (!isMatch) {
          return NextResponse.json(
            { 
              valid: false, 
              error: 'extension_mismatch', 
              message: `This license key is not valid for this product. (Required: ${licenseData.productName || licenseData.productId})` 
            },
            { status: 200, headers: corsHeaders() }
          );
        }
      }

      // --- Check 1.2: Email Matching ---
      if (licenseData.email && licenseData.email.toLowerCase().trim() !== cleanEmail) {
        return NextResponse.json(
          { valid: false, error: 'email_mismatch', message: 'License key is valid, but purchase email does not match.' },
          { status: 200, headers: corsHeaders() }
        );
      }

      // --- Check 1.3: Blocked / Suspended Status ---
      if (licenseData.status === 'blocked') {
        return NextResponse.json(
          { valid: false, error: 'blocked', message: 'This license key has been suspended or blocked by administrator.' },
          { status: 200, headers: corsHeaders() }
        );
      }

      // --- Check 1.4: Subscription Expiration & Renewal Check ---
      const nowSeconds = Math.floor(Date.now() / 1000);
      let isExpired = false;

      if (licenseData.status === 'expired' || licenseData.status === 'cancelled' || licenseData.status === 'unpaid' || licenseData.status === 'inactive' || licenseData.status === 'halted') {
        isExpired = true;
      } else if (licenseData.expiresAt) {
        const expSec = licenseData.expiresAt.seconds || Math.floor(new Date(licenseData.expiresAt).getTime() / 1000);
        if (expSec < nowSeconds) {
          isExpired = true;
          // Mark license as expired
          try {
            if (adminDb) {
              await adminDb.collection('licenses').doc(licenseDocId).update({ status: 'expired' });
            } else {
              await updateDoc(doc(db, 'licenses', licenseDocId), { status: 'expired' });
            }
          } catch (e) {
            console.error("Error updating license status to expired:", e);
          }
        }
      }

      if (isExpired) {
        const errorMsg = licenseData.isPromoterTrial 
          ? 'Promotion trial period has ended. Please submit your video link in Creator Dashboard to activate permanently.'
          : 'Please renew your subscription to continue using CreativeBox PRO.';

        return NextResponse.json(
          { 
            valid: false, 
            error: licenseData.isPromoterTrial ? 'promoter_trial_expired' : 'subscription_expired', 
            message: errorMsg
          },
          { status: 200, headers: corsHeaders() }
        );
      }

      // --- Check 1.5: Device Limit Enforcement & Validation ---
      const registeredDevices: any[] = licenseData.devices || [];
      const existingDevice = registeredDevices.find((d: any) => d.id === deviceId);
      const nowIso = new Date().toISOString();

      if (existingDevice) {
        // Ensure machineId field is synced and update lastSeen
        const formattedMachineId = existingDevice.name + ' (' + existingDevice.id + ')';
        const updatedDevices = registeredDevices.map((d: any) =>
          d.id === deviceId ? { ...d, lastSeen: nowIso } : d
        );
        try {
          if (adminDb) {
            await adminDb.collection('licenses').doc(licenseDocId).update({ machineId: formattedMachineId, devices: updatedDevices });
          } else {
            await updateDoc(doc(db, 'licenses', licenseDocId), { machineId: formattedMachineId, devices: updatedDevices });
          }
        } catch (e) {}
      } else {
        // If this is a background validation check and the device was not found in registeredDevices
        // (meaning admin logged out the device remotely), do NOT re-register automatically!
        if (body.isActivation === false) {
          return NextResponse.json(
            { 
              valid: false, 
              error: 'device_unbound', 
              message: 'This device has been logged out remotely. Please log in again.' 
            },
            { status: 200, headers: corsHeaders() }
          );
        }

        if (registeredDevices.length >= MAX_DEVICES_PER_LICENSE) {
          return NextResponse.json(
            { 
              valid: false, 
              error: 'device_limit_exceeded', 
              message: `Maximum device limit reached (${registeredDevices.length}/${MAX_DEVICES_PER_LICENSE}). Deactivate an existing machine to proceed.`,
              devices: registeredDevices
            },
            { status: 200, headers: corsHeaders() }
          );
        }

        // Register new device
        const newDevice = {
          id: deviceId || 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          name: deviceName || 'Workstation',
          activatedAt: nowIso,
          lastSeen: nowIso
        };

        const updatedDevices = registeredDevices.concat([newDevice]);
        const formattedMachineId = newDevice.name + ' (' + newDevice.id + ')';

        try {
          if (adminDb) {
            await adminDb.collection('licenses').doc(licenseDocId).update({
              machineId: formattedMachineId,
              devices: updatedDevices
            });
          } else {
            await updateDoc(doc(db, 'licenses', licenseDocId), {
              machineId: formattedMachineId,
              devices: updatedDevices
            });
          }
        } catch (e) {
          console.error("Error registering device:", e);
        }
      }

      // Determine customer buyer name from license or customers database
      let buyerName = licenseData.customerName || licenseData.userName || licenseData.name || licenseData.buyerName || '';
      if (!buyerName && adminDb) {
        try {
          const custSnap = await adminDb.collection('customers').where('email', '==', cleanEmail).get();
          if (!custSnap.empty) {
            buyerName = custSnap.docs[0].data().name || '';
          }
        } catch (e) { }
      }
      if (!buyerName) {
        const rawPrefix = cleanEmail.split('@')[0].replace(/[0-9_.-]/g, ' ').trim();
        buyerName = rawPrefix ? rawPrefix.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Editor';
      }

      // SUCCESS - Website License Valid!
      return NextResponse.json(
        {
          valid: true,
          source: 'website',
          message: 'Activation Successful! ✓',
          license: {
            key: cleanKey,
            productName: licenseData.productName || 'CreativeBox PRO',
            buyerName: buyerName,
            type: licenseData.type || 'lifetime',
            status: 'active',
            expiresAt: licenseData.expiresAt ? (licenseData.expiresAt.seconds ? new Date(licenseData.expiresAt.seconds * 1000).toISOString() : licenseData.expiresAt) : null
          }
        },
        { headers: corsHeaders() }
      );
    }

    // ════════════════════════════════════════════════════
    // 2. GUMROAD LEGACY FALLBACK VERIFICATION
    // ════════════════════════════════════════════════════
    try {
      const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `product_id=${encodeURIComponent(GUMROAD_PRODUCT_ID)}&license_key=${encodeURIComponent(cleanKey)}&increment_uses_count=false`
      });

      const gumroadData = await gumroadRes.json();

      if (gumroadData && gumroadData.success) {
        const purchase = gumroadData.purchase;
        const buyerEmail = (purchase && purchase.email) ? purchase.email.toLowerCase().trim() : '';

        if (buyerEmail !== cleanEmail) {
          return NextResponse.json(
            { valid: false, error: 'email_mismatch', message: 'Gumroad license key is valid, but purchase email does not match.' },
            { status: 400, headers: corsHeaders() }
          );
        }

        // Check if Gumroad subscription was cancelled/refunded
        if (purchase.subscription_cancelled_at || purchase.refunded) {
          return NextResponse.json(
            { valid: false, error: 'subscription_expired', message: 'Please renew your subscription to continue using CreativeBox PRO.' },
            { status: 402, headers: corsHeaders() }
          );
        }

        return NextResponse.json(
          {
            valid: true,
            source: 'gumroad',
            message: 'Gumroad License Verified! ✓',
            license: {
              key: cleanKey,
              productName: purchase.product_name || 'CreativeBox PRO (Gumroad)',
              buyerName: purchase.full_name || 'Editor',
              type: 'gumroad',
              status: 'active'
            }
          },
          { headers: corsHeaders() }
        );
      }
    } catch (gumroadErr) {
      console.error("Gumroad fallback error:", gumroadErr);
    }

    // If neither Website nor Gumroad validated the key
    return NextResponse.json(
      { valid: false, error: 'invalid_key', message: 'Invalid license key or email. Please check your purchase details.' },
      { status: 404, headers: corsHeaders() }
    );

  } catch (error: any) {
    console.error("License verification endpoint error:", error);
    return NextResponse.json(
      { valid: false, error: 'server_error', message: 'License server error: ' + (error?.message || String(error)) },
      { status: 500, headers: corsHeaders() }
    );
  }
}
