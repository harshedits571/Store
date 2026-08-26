import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. APPROVE APPLICATION
    if (action === 'approve_application') {
      const { appId, email, name, platform, channelUrl, audienceSize, commissionRate, fixedCommission, referralCode } = body;
      const cleanEmail = email.trim().toLowerCase();
      const code = (referralCode || name.split(' ')[0] + '10').toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Create or update promoter account
      await adminDb.collection('promoters').doc(cleanEmail).set({
        email: cleanEmail,
        name: name,
        platform: platform || 'YouTube',
        channelUrl: channelUrl || '',
        audienceSize: audienceSize || '',
        commissionRate: parseFloat(commissionRate) || 20,
        fixedCommission: parseFloat(fixedCommission) || 0,
        referralCode: code,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        totalEarned: 0,
        totalPaid: 0,
        pendingBalance: 0,
      }, { merge: true });

      // Update application record
      if (appId) {
        await adminDb.collection('promoter_applications').doc(appId).update({
          status: 'approved',
          reviewedAt: new Date().toISOString(),
        });
      }

      // Create matching custom_link coupon for checkout tracking
      await adminDb.collection('custom_links').doc(code).set({
        active: true,
        pricingMode: 'discount',
        discountPercent: 10,
        products: [],
        maxRedemptions: 0,
        promoterEmail: cleanEmail,
        note: `Promoter Affiliate: ${name} (${cleanEmail})`,
      }, { merge: true });

      return NextResponse.json({ success: true, message: `Promoter ${name} approved!` });
    }

    // 2. REJECT APPLICATION
    if (action === 'reject_application') {
      const { appId } = body;
      await adminDb.collection('promoter_applications').doc(appId).update({
        status: 'rejected',
        reviewedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    // 3. GRANT TRIAL EXTENSION
    if (action === 'grant_trial') {
      const { email, productId, productName, productCategory, days, commissionRate, downloadUrl } = body;
      const cleanEmail = email.trim().toLowerCase();
      const trialDays = parseInt(days, 10) || 7;

      const expDate = new Date();
      expDate.setDate(expDate.getDate() + trialDays);

      const pCat = (productCategory || '').toLowerCase().trim();
      const pName = (productName || '').toLowerCase().trim();

      // Check if product is a genuine software tool/plugin vs a Project File / Asset pack
      const isSoftwareTool = ['plugin', 'script', 'extension', 'tool', 'software'].includes(pCat) || 
        (!pName.includes('project file') && !pName.includes('transition') && !pName.includes('assets') && !pName.includes('overlay') && !pName.includes('pack') && !pName.includes('lut') && !pName.includes('preset') && (pName.includes('script') || pName.includes('plugin') || pName.includes('extension') || pName.includes('box') || pName.includes('markly') || pName.includes('assetbox')));

      let randKey: string | null = null;

      if (isSoftwareTool) {
        randKey = 'CREVO-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

        // Create license in licenses collection ONLY for software tools/plugins
        await adminDb.collection('licenses').doc(randKey).set({
          licenseKey: randKey,
          email: cleanEmail,
          productId,
          productName: productName || 'Extension',
          status: 'active',
          type: 'promoter_trial',
          isPromoterTrial: true,
          trialDurationDays: trialDays,
          createdAt: new Date().toISOString(),
          expiresAt: expDate.toISOString(),
          machineId: null,
          devices: [],
          note: `Creator trial for ${cleanEmail} (${trialDays} days to upload)`
        });
      }

      // Create entry in promoter_grants collection (for BOTH extensions and project files)
      await adminDb.collection('promoter_grants').add({
        licenseKey: randKey,
        requiresKey: isSoftwareTool,
        promoterEmail: cleanEmail,
        productId,
        productName: productName || 'Product',
        productCategory: productCategory || (isSoftwareTool ? 'Plugin' : 'Project File'),
        downloadUrl: downloadUrl?.trim() || '',
        status: 'trial_active',
        trialDays,
        createdAt: new Date().toISOString(),
        expiresAt: expDate.toISOString(),
        isPermanent: false,
        commissionRate: parseFloat(commissionRate) || 20,
      });

      // Ensure promoter profile exists and is approved with coupon
      const code = (cleanEmail.split('@')[0] || 'CREATOR').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const promSnap = await adminDb.collection('promoters').doc(cleanEmail).get();
      if (!promSnap.exists) {
        await adminDb.collection('promoters').doc(cleanEmail).set({
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          commissionRate: parseFloat(commissionRate) || 20,
          referralCode: code,
          status: 'approved',
          approvedAt: new Date().toISOString(),
          totalEarned: 0,
          totalPaid: 0,
          pendingBalance: 0,
        }, { merge: true });
      } else {
        await adminDb.collection('promoters').doc(cleanEmail).set({
          status: 'approved',
          commissionRate: parseFloat(commissionRate) || 20,
        }, { merge: true });
      }

      await adminDb.collection('custom_links').doc(code).set({
        active: true,
        pricingMode: 'discount',
        discountPercent: 10,
        products: [],
        maxRedemptions: 0,
        promoterEmail: cleanEmail,
        note: `Promoter Affiliate: ${cleanEmail}`,
      }, { merge: true });

      // Update any pending promoter request
      const reqSnap = await adminDb.collection('promoter_requests')
        .where('promoterEmail', '==', cleanEmail)
        .where('productId', '==', productId)
        .where('status', '==', 'pending')
        .get();

      if (!reqSnap.empty) {
        await adminDb.collection('promoter_requests').doc(reqSnap.docs[0].id).update({
          status: 'granted',
          grantedAt: new Date().toISOString(),
          licenseKey: randKey
        });
      }

      return NextResponse.json({ success: true, licenseKey: randKey });
    }

    // 4. APPROVE PROOF & UNLOCK FOREVER
    if (action === 'approve_proof') {
      const { grantId, licenseKey } = body;

      if (licenseKey) {
        await adminDb.collection('licenses').doc(licenseKey).update({
          status: 'active',
          isPromoterTrial: false,
          type: 'lifetime',
          expiresAt: null,
          approvedAt: new Date().toISOString(),
          note: 'Promotion approved - Permanent lifetime access granted'
        });
      }

      if (grantId) {
        await adminDb.collection('promoter_grants').doc(grantId).update({
          status: 'approved_permanent',
          isPermanent: true,
          expiresAt: null,
          approvedAt: new Date().toISOString()
        });

        const proofSnap = await adminDb.collection('promoter_proof_submissions').where('grantId', '==', grantId).get();
        if (!proofSnap.empty) {
          await adminDb.collection('promoter_proof_submissions').doc(proofSnap.docs[0].id).update({
            status: 'approved',
            reviewedAt: new Date().toISOString()
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    // 5. REVOKE GRANT
    if (action === 'revoke_grant') {
      const { grantId, licenseKey } = body;

      if (licenseKey) {
        await adminDb.collection('licenses').doc(licenseKey).update({
          status: 'blocked',
          revokedAt: new Date().toISOString()
        });
      }

      if (grantId) {
        await adminDb.collection('promoter_grants').doc(grantId).update({
          status: 'revoked',
          revokedAt: new Date().toISOString()
        });
      }

      return NextResponse.json({ success: true });
    }

    // 6. RECORD PAYOUT
    if (action === 'record_payout') {
      const { email, name, amount, notes } = body;
      const cleanEmail = email.toLowerCase().trim();
      const amt = parseFloat(amount) || 0;

      await adminDb.collection('promoter_payouts').add({
        promoterEmail: cleanEmail,
        promoterName: name,
        amount: amt,
        notes: notes?.trim() || '',
        paidAt: new Date().toISOString(),
      });

      // Mark commissions as paid
      const commSnap = await adminDb.collection('promoter_commissions')
        .where('promoterEmail', '==', cleanEmail)
        .where('status', '!=', 'paid')
        .get();

      for (const doc of commSnap.docs) {
        await adminDb.collection('promoter_commissions').doc(doc.id).update({
          status: 'paid',
          paidAt: new Date().toISOString()
        });
      }

      const promSnap = await adminDb.collection('promoters').doc(cleanEmail).get();
      const currentPaid = Number(promSnap.data()?.totalPaid) || 0;
      const currentEarned = Number(promSnap.data()?.totalEarned) || 0;
      const newPaid = currentPaid + amt;
      const newPending = Math.max(0, currentEarned - newPaid);

      await adminDb.collection('promoters').doc(cleanEmail).set({
        totalPaid: newPaid,
        pendingBalance: newPending,
        lastPayoutAt: new Date().toISOString()
      }, { merge: true });

      return NextResponse.json({ success: true });
    }

    // 7. UPDATE COMMISSION RATE
    if (action === 'update_commission') {
      const { email, commissionRate, fixedCommission, grantId } = body;
      const cleanEmail = email.toLowerCase().trim();
      const commRate = parseFloat(commissionRate) >= 0 ? parseFloat(commissionRate) : 20;
      const fixComm = parseFloat(fixedCommission) >= 0 ? parseFloat(fixedCommission) : 0;

      // Update promoters document
      await adminDb.collection('promoters').doc(cleanEmail).set({
        commissionRate: commRate,
        fixedCommission: fixComm,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Update promoter_grants for this creator
      if (grantId) {
        await adminDb.collection('promoter_grants').doc(grantId).update({
          commissionRate: commRate,
        }).catch(() => {});
      } else {
        const grantsSnap = await adminDb.collection('promoter_grants')
          .where('promoterEmail', '==', cleanEmail)
          .get();
        for (const gDoc of grantsSnap.docs) {
          await adminDb.collection('promoter_grants').doc(gDoc.id).update({
            commissionRate: commRate,
          }).catch(() => {});
        }
      }

      return NextResponse.json({ success: true, commissionRate: commRate, fixedCommission: fixComm });
    }

    // 8. KICK / REMOVE PROMOTER
    if (action === 'kick_promoter') {
      const { email, appId } = body;
      const cleanEmail = (email || '').toLowerCase().trim();

      if (!cleanEmail && !appId) {
        return NextResponse.json({ success: false, error: 'Email or appId required to kick promoter' }, { status: 400 });
      }

      // 1. Revoke / Delete all grants & licenses
      if (cleanEmail) {
        const grantsSnap = await adminDb.collection('promoter_grants')
          .where('promoterEmail', '==', cleanEmail)
          .get();

        for (const gDoc of grantsSnap.docs) {
          const lKey = gDoc.data().licenseKey;
          if (lKey) {
            await adminDb.collection('licenses').doc(lKey).delete().catch(() => {});
          }
          await adminDb.collection('promoter_grants').doc(gDoc.id).delete().catch(() => {});
        }

        // 2. Deactivate / Delete promoter custom affiliate links
        const linksSnap = await adminDb.collection('custom_links')
          .where('promoterEmail', '==', cleanEmail)
          .get();

        for (const lDoc of linksSnap.docs) {
          await adminDb.collection('custom_links').doc(lDoc.id).delete().catch(() => {});
        }

        // 3. Delete from promoters collection
        await adminDb.collection('promoters').doc(cleanEmail).delete().catch(() => {});

        // 4. Delete promoter requests
        const reqsSnap = await adminDb.collection('promoter_requests')
          .where('promoterEmail', '==', cleanEmail)
          .get();

        for (const rDoc of reqsSnap.docs) {
          await adminDb.collection('promoter_requests').doc(rDoc.id).delete().catch(() => {});
        }

        // 5. Delete all applications with this email
        const appsSnap = await adminDb.collection('promoter_applications')
          .where('email', '==', cleanEmail)
          .get();

        for (const aDoc of appsSnap.docs) {
          await adminDb.collection('promoter_applications').doc(aDoc.id).delete().catch(() => {});
        }
      }

      if (appId) {
        await adminDb.collection('promoter_applications').doc(appId).delete().catch(() => {});
      }

      return NextResponse.json({ success: true, message: 'Promoter kicked and removed successfully' });
    }

    // 9. DELETE SINGLE GRANT
    if (action === 'delete_grant') {
      const { grantId, licenseKey } = body;
      if (licenseKey) {
        await adminDb.collection('licenses').doc(licenseKey).delete().catch(() => {});
      }
      if (grantId) {
        await adminDb.collection('promoter_grants').doc(grantId).delete().catch(() => {});
      }
      return NextResponse.json({ success: true, message: 'Grant deleted successfully' });
    }

    // 10. APPROVE CREATOR REQUEST (1-CLICK)
    if (action === 'approve_request') {
      const { requestId } = body;
      const rDoc = await adminDb.collection('promoter_requests').doc(requestId).get();
      if (!rDoc.exists) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }
      const rData = rDoc.data()!;
      const cleanEmail = (rData.promoterEmail || '').toLowerCase().trim();
      const trialDays = parseInt(rData.expectedTurnaroundDays, 10) || 7;
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + trialDays);

      const pCat = (rData.productCategory || '').toLowerCase().trim();
      const pName = (rData.productName || '').toLowerCase().trim();

      const isSoftwareTool = ['plugin', 'script', 'extension', 'tool', 'software'].includes(pCat) ||
        (!pName.includes('project file') && !pName.includes('transition') && !pName.includes('assets') && !pName.includes('overlay') && !pName.includes('pack') && (pName.includes('script') || pName.includes('plugin') || pName.includes('extension') || pName.includes('box')));

      let randKey: string | null = null;
      if (isSoftwareTool) {
        randKey = 'CREVO-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

        await adminDb.collection('licenses').doc(randKey).set({
          licenseKey: randKey,
          email: cleanEmail,
          productId: rData.productId,
          productName: rData.productName,
          status: 'active',
          type: 'promoter_trial',
          isPromoterTrial: true,
          trialDurationDays: trialDays,
          createdAt: new Date().toISOString(),
          expiresAt: expDate.toISOString(),
          machineId: null,
          devices: [],
          note: `Creator request granted for ${cleanEmail}`
        });
      }

      await adminDb.collection('promoter_grants').add({
        licenseKey: randKey,
        requiresKey: isSoftwareTool,
        promoterEmail: cleanEmail,
        productId: rData.productId,
        productName: rData.productName,
        productCategory: rData.productCategory || (isSoftwareTool ? 'Plugin' : 'Project File'),
        downloadUrl: rData.downloadUrl || '',
        status: 'trial_active',
        trialDays,
        createdAt: new Date().toISOString(),
        expiresAt: expDate.toISOString(),
        isPermanent: !isSoftwareTool,
        commissionRate: 20,
      });

      await adminDb.collection('promoter_requests').doc(requestId).update({
        status: 'granted',
        grantedAt: new Date().toISOString(),
        licenseKey: randKey
      });

      return NextResponse.json({ success: true, message: 'Request approved & access granted!' });
    }

    // 11. REJECT / DISMISS CREATOR REQUEST
    if (action === 'reject_request') {
      const { requestId } = body;
      await adminDb.collection('promoter_requests').doc(requestId).update({
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
      return NextResponse.json({ success: true, message: 'Request rejected' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/admin/promoters/action:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error processing action' },
      { status: 500 }
    );
  }
}
