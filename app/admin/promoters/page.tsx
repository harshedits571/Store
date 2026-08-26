'use client';
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStore } from '../../context/StoreContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useAdmin } from '../../context/AdminContext';

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '16px',
  border: '1px solid var(--border-subtle)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
  padding: '24px',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: '0.875rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

export default function AdminPromotersPage() {
  const { products } = useStore();
  const { formatPrice } = useCurrency();
  const { customers } = useAdmin();

  const [activeTab, setActiveTab] = useState<'applications' | 'grants' | 'proofs' | 'commissions'>('applications');
  const [applications, setApplications] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter only real extensions/plugins that actually require software license keys
  const isExtensionProduct = (p: any) => {
    if (!p) return false;
    const cat = (p.category || '').toLowerCase().trim();
    const name = (p.name || '').toLowerCase().trim();
    
    // Explicit flags
    if (p.requiresLicense === false) return false;
    if (p.requiresLicense === true) return true;

    // Check project file or asset keywords
    if (name.includes('project file') || name.includes('transition') || name.includes('assets') || name.includes('overlay') || name.includes('pack') || name.includes('lut') || name.includes('preset')) {
      if (!cat.includes('plugin') && !cat.includes('script') && !cat.includes('extension')) {
        return false;
      }
    }

    return ['plugin', 'script', 'extension', 'tool', 'software'].includes(cat) || name.includes('script') || name.includes('plugin') || name.includes('extension') || name.includes('markly') || name.includes('assetbox') || name.includes('creativebox');
  };

  const extensionProducts = products.filter(isExtensionProduct);

  // Modals state
  const [approveAppModal, setApproveAppModal] = useState<any>(null);
  const [appCommissionRate, setAppCommissionRate] = useState('20');
  const [appFixedCommission, setAppFixedCommission] = useState('0');
  const [appReferralCode, setAppReferralCode] = useState('');
  const [processingApp, setProcessingApp] = useState(false);

  const [grantModalData, setGrantModalData] = useState<any>(null);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantProductId, setGrantProductId] = useState('');
  const [grantDays, setGrantDays] = useState('7');
  const [grantCommission, setGrantCommission] = useState('20');
  const [grantDownloadUrl, setGrantDownloadUrl] = useState('');
  const [grantingLicense, setGrantingLicense] = useState(false);

  const [payoutModalPromoter, setPayoutModalPromoter] = useState<any>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);

  // Edit Commission State
  const [editCommModal, setEditCommModal] = useState<{ email: string; name?: string; grantId?: string; rate: string; fixed: string } | null>(null);
  const [processingEditComm, setProcessingEditComm] = useState(false);

  // Kick / Remove Creator State
  const [kickTarget, setKickTarget] = useState<{ email: string; name?: string; appId?: string } | null>(null);
  const [kickingPromoter, setKickingPromoter] = useState(false);

  // Request Actions State
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  // Badge Counts
  const pendingAppsCount = applications.filter(a => a.status === 'pending').length;
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;
  const pendingProofsCount = proofs.filter(p => p.status === 'pending' || !p.status).length;

  const handleExecuteKick = async () => {
    if (!kickTarget) return;
    setKickingPromoter(true);
    try {
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'kick_promoter',
          email: kickTarget.email,
          appId: kickTarget.appId
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to kick creator.');

      showToast(`Creator "${kickTarget.name || kickTarget.email}" kicked & revoked successfully!`, 'success');
      setKickTarget(null);
      fetchPromotersData();
    } catch (err: any) {
      showToast('Error kicking creator: ' + err?.message, 'error');
    } finally {
      setKickingPromoter(false);
    }
  };

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all promoter data from Server Admin API
  const fetchPromotersData = async () => {
    try {
      const res = await fetch('/api/admin/promoters');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.applications)) {
            const apps = data.applications;
            apps.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setApplications(apps);
          }
          if (Array.isArray(data.promoters)) setPromoters(data.promoters);
          if (Array.isArray(data.grants)) {
            const gList = data.grants;
            gList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setGrants(gList);
          }
          if (Array.isArray(data.requests)) setRequests(data.requests);
          if (Array.isArray(data.proofs)) {
            const pList = data.proofs;
            pList.sort((a: any, b: any) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
            setProofs(pList);
          }
          if (Array.isArray(data.commissions)) setCommissions(data.commissions);
        }
      }
    } catch (e) {
      console.error("Error fetching promoter data from API:", e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Firestore listeners + Initial API fetch
  useEffect(() => {
    fetchPromotersData();

    // Client real-time listeners for live updates
    const unsubApps = onSnapshot(collection(db, 'promoter_applications'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setApplications(list);
      }
    }, () => {});

    const unsubPromoters = onSnapshot(collection(db, 'promoters'), (snap) => {
      if (!snap.empty) {
        setPromoters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }, () => {});

    const unsubGrants = onSnapshot(collection(db, 'promoter_grants'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setGrants(list);
      }
    }, () => {});

    const unsubRequests = onSnapshot(collection(db, 'promoter_requests'), (snap) => {
      if (!snap.empty) {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }, () => {});

    const unsubProofs = onSnapshot(collection(db, 'promoter_proof_submissions'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
        setProofs(list);
      }
    }, () => {});

    const unsubCommissions = onSnapshot(collection(db, 'promoter_commissions'), (snap) => {
      if (!snap.empty) {
        setCommissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }, () => {});

    return () => {
      unsubApps();
      unsubPromoters();
      unsubGrants();
      unsubRequests();
      unsubProofs();
      unsubCommissions();
    };
  }, []);

  // 1. Approve Creator Application
  const handleApproveApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveAppModal) return;

    setProcessingApp(true);
    try {
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_application',
          appId: approveAppModal.id,
          email: approveAppModal.email,
          name: approveAppModal.name,
          platform: approveAppModal.platform,
          channelUrl: approveAppModal.channelUrl,
          audienceSize: approveAppModal.audienceSize,
          commissionRate: appCommissionRate,
          fixedCommission: appFixedCommission,
          referralCode: appReferralCode
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve application.');
      }

      showToast(`Promoter "${approveAppModal.name}" approved!`, 'success');
      setApproveAppModal(null);
      fetchPromotersData();
    } catch (err: any) {
      console.error(err);
      showToast('Error approving application: ' + err?.message, 'error');
    } finally {
      setProcessingApp(false);
    }
  };

  // Reject Application
  const handleRejectApplication = async (appId: string) => {
    if (!confirm('Reject this promoter application?')) return;
    try {
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_application', appId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reject.');

      showToast('Application marked as rejected.', 'success');
      fetchPromotersData();
    } catch (err: any) {
      showToast('Error updating status: ' + err?.message, 'error');
    }
  };

  // 2. Grant Extension Trial to Creator
  const handleGrantTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim() || !grantProductId) return;

    setGrantingLicense(true);
    try {
      const product = products.find(p => p.id === grantProductId);
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grant_trial',
          email: grantEmail,
          productId: grantProductId,
          productName: product?.name || 'Extension',
          productCategory: product?.category || 'Plugin',
          days: grantDays,
          commissionRate: grantCommission,
          downloadUrl: grantDownloadUrl || (product?.versions?.[0]?.downloadUrl || '')
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to grant license.');

      showToast(`Granted ${grantDays}-day trial license!`, 'success');
      setGrantModalData(null);
      setGrantEmail('');
      setGrantProductId('');
      setGrantDownloadUrl('');
      fetchPromotersData();
    } catch (err: any) {
      console.error(err);
      showToast('Error granting license: ' + err?.message, 'error');
    } finally {
      setGrantingLicense(false);
    }
  };

  // 3. Approve Video Proof & Convert to Lifetime Permanent
  const handleApproveProof = async (grantId: string, licenseKey: string) => {
    if (!confirm('Approve this promotion proof? The license will be permanently unlocked for this creator.')) return;
    try {
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_proof', grantId, licenseKey })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to approve proof.');

      showToast('Promotion approved! License is now PERMANENT.', 'success');
      fetchPromotersData();
    } catch (err: any) {
      showToast('Error approving proof: ' + err?.message, 'error');
    }
  };

  // Revoke / Deactivate License
  const handleRevokeGrant = async (grantId: string, licenseKey: string) => {
    try {
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_grant', grantId, licenseKey })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to revoke grant.');

      showToast('License deactivated.', 'success');
      fetchPromotersData();
    } catch (err: any) {
      showToast('Error revoking license: ' + err?.message, 'error');
    }
  };

  // Delete Grant
  const handleDeleteGrant = async (grantId: string, licenseKey: string) => {
    try {
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_grant', grantId, licenseKey })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete grant.');

      showToast('Grant removed successfully.', 'success');
      fetchPromotersData();
    } catch (err: any) {
      showToast('Error deleting grant: ' + err?.message, 'error');
    }
  };

  // 1-Click Approve Creator Request
  const handleApproveRequest = async (requestId: string) => {
    setProcessingReqId(requestId);
    try {
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_request', requestId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to approve request.');

      showToast('Creator request approved & access granted! 🚀', 'success');
      fetchPromotersData();
    } catch (err: any) {
      showToast('Error approving request: ' + err?.message, 'error');
    } finally {
      setProcessingReqId(null);
    }
  };

  // Reject Creator Request
  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_request', requestId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to dismiss request.');

      showToast('Request dismissed.', 'success');
      fetchPromotersData();
    } catch (err: any) {
      showToast('Error dismissing request: ' + err?.message, 'error');
    }
  };

  // 4. Mark Payout as Paid
  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalPromoter || !payoutAmount) return;

    setProcessingPayout(true);
    try {
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_payout',
          email: payoutModalPromoter.email,
          name: payoutModalPromoter.name,
          amount: payoutAmount,
          notes: payoutNote
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to record payout.');

      showToast(`Recorded payout of ₹${parseFloat(payoutAmount).toLocaleString('en-IN')} for ${payoutModalPromoter.name}`, 'success');
      setPayoutModalPromoter(null);
      setPayoutAmount('');
      setPayoutNote('');
      fetchPromotersData();
    } catch (err: any) {
      showToast('Error recording payout: ' + err?.message, 'error');
    } finally {
      setProcessingPayout(false);
    }
  };

  // 5. Update Commission Rate
  const handleUpdateCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCommModal) return;

    setProcessingEditComm(true);
    try {
      const res = await fetch('/api/admin/promoters/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_commission',
          email: editCommModal.email,
          commissionRate: editCommModal.rate,
          fixedCommission: editCommModal.fixed,
          grantId: editCommModal.grantId || null,
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update commission.');

      showToast(`Updated commission for ${editCommModal.email}`, 'success');
      setEditCommModal(null);
      fetchPromotersData();
    } catch (err: any) {
      showToast('Error updating commission: ' + err?.message, 'error');
    } finally {
      setProcessingEditComm(false);
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 99999,
          background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
          color: toast.type === 'success' ? '#065F46' : '#991B1B',
          padding: '12px 20px', borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          fontWeight: 600, fontSize: '0.875rem'
        }}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            Promoters & Creator Collaborations
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Manage influencer applications, grant time-limited extension licenses, review video submissions, and track sales commissions.
          </p>
        </div>

        <button
          onClick={() => {
            const extProds = products.filter(isExtensionProduct);
            setGrantModalData({});
            setGrantEmail('');
            setGrantProductId(extProds[0]?.id || '');
            setGrantDays('7');
            setGrantCommission('20');
          }}
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: '0.88rem' }}
        >
          ➕ Grant Extension License
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '4px', marginBottom: '28px', overflowX: 'auto' }}>
        {[
          { id: 'applications', label: `📥 Applications (${applications.length})`, badge: pendingAppsCount },
          { id: 'grants', label: `📦 Active Grants & Requests (${grants.length})`, badge: pendingRequestsCount },
          { id: 'proofs', label: `🎬 Review Video Proofs (${proofs.length})`, badge: pendingProofsCount },
          { id: 'commissions', label: `💰 Commissions & Payouts (${promoters.length})`, badge: 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === tab.id ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '100px', fontWeight: 800 }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: APPLICATIONS */}
      {activeTab === 'applications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {applications.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px', color: 'var(--text-secondary)' }}>
              No promoter applications received yet. Creators can apply at <strong>/promoter/apply</strong>.
            </div>
          ) : (
            applications.map((app) => {
              const matchedCustomer = customers?.find((c: any) => c.email?.toLowerCase() === app.email?.toLowerCase());
              const matchedPromoter = promoters?.find((p: any) => p.email?.toLowerCase() === app.email?.toLowerCase());
              const realGooglePhoto = app.photoURL || app.photoUrl || app.avatarUrl || matchedCustomer?.photoURL || matchedPromoter?.photoURL;
              const fallbackDiceBear = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(app.name || app.email)}&scale=110`;
              const avatarSrc = realGooglePhoto || fallbackDiceBear;
              const isApproved = app.status === 'approved';
              const isPending = app.status === 'pending';
              const isRejected = app.status === 'rejected';

              return (
                <div
                  key={app.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '20px',
                    padding: '24px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Top Row: Avatar + Name + Status + Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    {/* Left: Avatar & Identity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px' }}>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        background: 'rgba(0, 113, 227, 0.08)',
                        border: '1.5px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <img
                          src={avatarSrc}
                          alt={app.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = fallbackDiceBear;
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                            {app.name}
                          </h3>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '100px',
                            fontSize: '0.725rem',
                            fontWeight: 800,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                            background: isApproved ? 'rgba(16, 185, 129, 0.12)' : isRejected ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: isApproved ? '#10B981' : isRejected ? '#EF4444' : '#D97706',
                            border: isApproved ? '1px solid rgba(16, 185, 129, 0.3)' : isRejected ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                          }}>
                            {isApproved ? '✓ Approved Creator' : isRejected ? '✕ Rejected' : '⏳ Pending Review'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span>📧 {app.email}</span>
                          {app.createdAt && (
                            <>
                              <span style={{ color: 'var(--border-subtle)' }}>•</span>
                              <span>📅 Applied {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {!isApproved && (
                        <button
                          onClick={() => {
                            setApproveAppModal(app);
                            setAppCommissionRate('20');
                            setAppFixedCommission('0');
                            setAppReferralCode((app.name.split(' ')[0] + '10').toUpperCase().replace(/[^A-Z0-9]/g, ''));
                          }}
                          className="btn-primary"
                          style={{ padding: '9px 18px', fontSize: '0.84rem', borderRadius: '10px', fontWeight: 700 }}
                        >
                          ✓ Approve Creator
                        </button>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => {
                            const extProds = products.filter(isExtensionProduct);
                            setGrantModalData({});
                            setGrantEmail(app.email);
                            setGrantProductId(extProds[0]?.id || '');
                            setGrantDays(String(app.expectedTurnaroundDays || 7));
                            setGrantCommission('20');
                          }}
                          style={{
                            padding: '9px 18px',
                            fontSize: '0.84rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(0, 113, 227, 0.3)',
                            background: 'rgba(0, 113, 227, 0.1)',
                            color: 'var(--accent-primary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          📦 Grant Extension
                        </button>
                      )}

                      {isPending && (
                        <button
                          onClick={() => handleRejectApplication(app.id)}
                          style={{
                            padding: '9px 14px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-secondary)',
                            color: '#EF4444',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ✕ Reject
                        </button>
                      )}

                      <button
                        onClick={() => setKickTarget({ email: app.email, name: app.name, appId: app.id })}
                        style={{
                          padding: '9px 16px',
                          borderRadius: '10px',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#EF4444',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🚫 Kick Creator
                      </button>
                    </div>
                  </div>

                  {/* Middle Row: Visual Metadata Cards (Platform, Audience, Niche, Turnaround) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.25rem' }}>
                        {app.platform?.toLowerCase().includes('youtube') ? '🔴' : app.platform?.toLowerCase().includes('insta') ? '📸' : '📺'}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Platform & Reach</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {app.platform || 'Social'} ({app.audienceSize || '1k-10k'})
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.25rem' }}>🎯</span>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Content Niche</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {app.niche || 'Video Editing / VFX'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.25rem' }}>⏱️</span>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Turnaround Time</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {app.expectedTurnaroundDays || 7} Days
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.25rem' }}>🔗</span>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Channel / Social</div>
                        <a
                          href={app.channelUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          Visit Social Link ↗
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Pitch / Video Plan Box */}
                  {app.pitch && (
                    <div style={{
                      background: 'rgba(0, 113, 227, 0.04)',
                      border: '1px solid rgba(0, 113, 227, 0.14)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      color: 'var(--text-primary)'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        💡 Creator's Video Promotion Pitch & Plan:
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {app.pitch}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE GRANTS & REQUESTS */}
      {activeTab === 'grants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Pending Extension & Project File Requests Section */}
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.04)',
              border: '1.5px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>🔔</span>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#D97706' }}>
                      Pending Creator Requests ({requests.filter(r => r.status === 'pending').length})
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Creators requesting access to project files or software tools for promotional content.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                {requests.filter(r => r.status === 'pending').map((req) => {
                  const matchedCustomer = customers?.find((c: any) => c.email?.toLowerCase() === req.promoterEmail?.toLowerCase());
                  const avatarSrc = req.photoURL || matchedCustomer?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(req.promoterName || req.promoterEmail)}&scale=110`;
                  const isSoftware = isExtensionProduct(products.find(p => p.id === req.productId) || { name: req.productName, category: req.productCategory });

                  return (
                    <div
                      key={req.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
                      }}
                    >
                      {/* Top Creator Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={avatarSrc}
                          alt={req.promoterName}
                          referrerPolicy="no-referrer"
                          style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{req.promoterName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {req.promoterEmail}
                          </div>
                        </div>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: isSoftware ? 'rgba(0, 113, 227, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: isSoftware ? 'var(--accent-primary)' : '#10B981',
                        }}>
                          {isSoftware ? '🧩 Extension' : '📁 Project File'}
                        </span>
                      </div>

                      {/* Product Name */}
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                          Requested Item:
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                          {req.productName}
                        </div>
                        {req.pitch && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                            "{req.pitch}"
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          ⏱️ Delivery: within {req.expectedTurnaroundDays || 7} days
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <button
                          disabled={processingReqId === req.id}
                          onClick={() => handleApproveRequest(req.id)}
                          className="btn-primary"
                          style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', justifyContent: 'center' }}
                        >
                          {processingReqId === req.id ? 'Granting...' : isSoftware ? '🚀 Approve & Issue Key' : '🚀 Approve & Grant Access'}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#EF4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Grants Table */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>All Creator Products, Extensions & Access Grants</h3>
            {grants.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No creator products or extension licenses granted yet.
              </div>
            ) : (
              <div style={{ ...cardStyle, padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 16px' }}>Creator</th>
                      <th style={{ padding: '12px 16px' }}>Product / Extension</th>
                      <th style={{ padding: '12px 16px' }}>License Key / Access</th>
                      <th style={{ padding: '12px 16px' }}>Status / Deadline</th>
                      <th style={{ padding: '12px 16px' }}>Commission</th>
                      <th style={{ padding: '12px 16px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grants.map((g) => {
                      const isPermanent = g.status === 'approved_permanent' || g.isPermanent;
                      const isRevoked = g.status === 'revoked';
                      const expMs = g.expiresAt ? (g.expiresAt.seconds ? g.expiresAt.seconds * 1000 : new Date(g.expiresAt).getTime()) : 0;
                      const isExpired = !isPermanent && !isRevoked && expMs > 0 && expMs < Date.now();

                      return (
                        <tr key={g.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{g.promoterEmail}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontWeight: 600 }}>{g.productName}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {g.licenseKey ? (
                              <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                background: 'rgba(0, 113, 227, 0.08)',
                                color: 'var(--accent-primary)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid rgba(0, 113, 227, 0.2)'
                              }}>
                                {g.licenseKey}
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#10B981',
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                📁 Direct Asset (No Key Needed)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {isPermanent ? (
                              <span style={{ color: '#10B981', fontWeight: 700 }}>✓ Permanent Active</span>
                            ) : isRevoked ? (
                              <span style={{ color: '#EF4444', fontWeight: 700 }}>✕ Revoked</span>
                            ) : isExpired ? (
                              <span style={{ color: '#EF4444', fontWeight: 700 }}>⌛ Trial Expired</span>
                            ) : (
                              <span style={{ color: '#D97706', fontWeight: 700 }}>
                                ⏳ Expires in {Math.ceil((expMs - Date.now()) / (1000 * 60 * 60 * 24))} days
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{g.commissionRate !== undefined ? `${g.commissionRate}%` : '20%'}</span>
                              <button
                                onClick={() => setEditCommModal({
                                  email: g.promoterEmail,
                                  grantId: g.id,
                                  rate: String(g.commissionRate !== undefined ? g.commissionRate : 20),
                                  fixed: '0',
                                })}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-glass)',
                                  color: 'var(--accent-primary)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', display: 'flex', gap: '6px' }}>
                            {!isPermanent && !isRevoked && (
                              <button
                                onClick={() => handleApproveProof(g.id, g.licenseKey)}
                                style={{ padding: '4px 10px', borderRadius: '6px', background: '#10B981', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Make Permanent
                              </button>
                            )}
                            {!isRevoked && (
                              <button
                                onClick={() => handleRevokeGrant(g.id, g.licenseKey)}
                                style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Deactivate
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteGrant(g.id, g.licenseKey)}
                              style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                              title="Delete this grant"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: PROOF SUBMISSIONS */}
      {activeTab === 'proofs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {proofs.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 24px', color: 'var(--text-secondary)' }}>
              No video / post proofs submitted yet. When creators publish videos, their links will appear here for review!
            </div>
          ) : (
            proofs.map((p) => {
              const matchedGrant = grants.find(g => g.id === p.grantId);

              return (
                <div key={p.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                        {p.productName} — by {p.promoterName}
                      </h3>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '100px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: p.status === 'approved' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 113, 227, 0.12)',
                        color: p.status === 'approved' ? '#10B981' : '#0071E3'
                      }}>
                        {p.status === 'approved' ? '✓ Approved & Permanent' : '🔍 Pending Review'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      Creator: <strong>{p.promoterEmail}</strong> • Submitted on: {new Date(p.submittedAt).toLocaleDateString()}
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 16px', marginBottom: '10px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Published Content Link:
                      </div>
                      <a
                        href={p.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--accent-primary)', fontSize: '0.92rem', fontWeight: 700, textDecoration: 'underline', wordBreak: 'break-all' }}
                      >
                        🎬 {p.proofUrl} &rarr;
                      </a>

                      {p.proofNotes && (
                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <strong>Notes:</strong> {p.proofNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                    {p.status !== 'approved' && matchedGrant && (
                      <button
                        onClick={() => handleApproveProof(matchedGrant.id, matchedGrant.licenseKey)}
                        className="btn-primary"
                        style={{ padding: '10px 16px', fontSize: '0.85rem', background: '#10B981', border: 'none' }}
                      >
                        ✓ Approve & Unlock Forever
                      </button>
                    )}

                    {matchedGrant && (
                      <button
                        onClick={() => handleRevokeGrant(matchedGrant.id, matchedGrant.licenseKey)}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'none', color: '#EF4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Deactivate License
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: COMMISSIONS & PAYOUTS */}
      {activeTab === 'commissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ ...cardStyle, padding: '0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Creator</th>
                  <th style={{ padding: '12px 16px' }}>Referral Code</th>
                  <th style={{ padding: '12px 16px' }}>Commission Rate</th>
                  <th style={{ padding: '12px 16px' }}>Total Sales</th>
                  <th style={{ padding: '12px 16px' }}>Total Earned</th>
                  <th style={{ padding: '12px 16px' }}>Pending Payout</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promoters.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No approved promoters found.
                    </td>
                  </tr>
                ) : (
                  promoters.map((promoter) => {
                    const creatorComms = commissions.filter(c => c.promoterEmail === promoter.email.toLowerCase());
                    const totalSales = creatorComms.length;
                    const totalEarnedAmt = creatorComms.reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);
                    const paidAmt = creatorComms.filter(c => c.status === 'paid').reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);
                    const pendingAmt = totalEarnedAmt - paidAmt;

                    return (
                      <tr key={promoter.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #0071E3, #8B5CF6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              overflow: 'hidden',
                              flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(0, 113, 227, 0.2)'
                            }}>
                              {promoter.photoURL ? (
                                <img
                                  src={promoter.photoURL}
                                  alt={promoter.name || 'Promoter'}
                                  referrerPolicy="no-referrer"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                promoter.name ? promoter.name.charAt(0).toUpperCase() : 'P'
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700 }}>{promoter.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{promoter.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {promoter.referralCode || 'DEFAULT'}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{promoter.commissionRate !== undefined ? `${promoter.commissionRate}%` : `₹${promoter.fixedCommission || 0}/sale`}</span>
                            <button
                              onClick={() => setEditCommModal({
                                email: promoter.email,
                                name: promoter.name,
                                rate: String(promoter.commissionRate !== undefined ? promoter.commissionRate : 20),
                                fixed: String(promoter.fixedCommission || 0),
                              })}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--bg-glass)',
                                color: 'var(--accent-primary)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700 }}>{totalSales} orders</td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10B981' }}>
                          ₹{totalEarnedAmt.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: pendingAmt > 0 ? '#F59E0B' : 'var(--text-muted)' }}>
                          ₹{pendingAmt.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {pendingAmt > 0 ? (
                            <button
                              onClick={() => {
                                setPayoutModalPromoter(promoter);
                                setPayoutAmount(String(pendingAmt));
                                setPayoutNote(`Payout via UPI / Bank for ${creatorComms.length} sales`);
                              }}
                              className="btn-primary"
                              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                            >
                              💸 Mark as Paid
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>All Clear ✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* MODAL: APPROVE PROMOTER APPLICATION */}
      {approveAppModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 99999 }}>
          <div style={{ ...cardStyle, maxWidth: '480px', width: '100%', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0' }}>
              Approve Promoter Application
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Configure affiliate settings for <strong>{approveAppModal.name}</strong> ({approveAppModal.email}).
            </p>

            <form onSubmit={handleApproveApplication} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Commission Rate (% per sale) — Enter 0 for review-only without commission
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.1"
                  style={inputStyle}
                  value={appCommissionRate}
                  onChange={(e) => setAppCommissionRate(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Or Fixed Cash Commission (₹ per sale, optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  style={inputStyle}
                  value={appFixedCommission}
                  onChange={(e) => setAppFixedCommission(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Unique Audience Referral Coupon Code
                </label>
                <input
                  type="text"
                  required
                  style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 700 }}
                  value={appReferralCode}
                  onChange={(e) => setAppReferralCode(e.target.value.toUpperCase())}
                  placeholder="CREATOR10"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setApproveAppModal(null)} className="btn-secondary" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={processingApp} className="btn-primary" style={{ padding: '8px 20px' }}>
                  {processingApp ? 'Approving...' : '✓ Approve & Create Creator Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GRANT TRIAL EXTENSION */}
      {grantModalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 99999 }}>
          <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0' }}>
              Grant Extension Trial License
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Generates a time-limited trial license. If creator does not upload within the deadline, license auto-expires.
            </p>

            <form onSubmit={handleGrantTrial} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Creator Email Address *
                </label>
                <input
                  type="email"
                  required
                  style={inputStyle}
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="creator@gmail.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  Select Product / Extension to Grant *
                </label>
                <select
                  required
                  style={inputStyle}
                  value={grantProductId}
                  onChange={(e) => setGrantProductId(e.target.value)}
                >
                  <option value="">-- Choose Product to Grant --</option>
                  
                  {extensionProducts.length > 0 && (
                    <optgroup label="🧩 Software Plugins & Extensions (License Key Generated)">
                      {extensionProducts.map(p => (
                        <option key={p.id} value={p.id}>🧩 {p.name} ({p.category || 'Plugin'})</option>
                      ))}
                    </optgroup>
                  )}

                  <optgroup label="📁 Project Files & Asset Packs (Direct Access - No Key Needed)">
                    {products.filter(p => !isExtensionProduct(p)).map(p => (
                      <option key={p.id} value={p.id}>📁 {p.name} ({p.category || 'Project File'})</option>
                    ))}
                  </optgroup>
                </select>

                {grantProductId && (
                  <p style={{ fontSize: '0.78rem', marginTop: '6px', color: isExtensionProduct(products.find(p => p.id === grantProductId)) ? 'var(--accent-primary)' : '#10B981', fontWeight: 600 }}>
                    {isExtensionProduct(products.find(p => p.id === grantProductId))
                      ? '🧩 Software Plugin: A time-limited license key will be generated for software activation.'
                      : '📁 Project File / Asset: Direct download access will be granted (No license key required).'}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Trial Duration (Days to Upload)
                  </label>
                  <select
                    style={inputStyle}
                    value={grantDays}
                    onChange={(e) => setGrantDays(e.target.value)}
                  >
                    <option value="3">3 Days (Fast Track)</option>
                    <option value="7">7 Days (1 Week)</option>
                    <option value="14">14 Days (2 Weeks)</option>
                    <option value="30">30 Days (1 Month)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Sales Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    style={inputStyle}
                    value={grantCommission}
                    onChange={(e) => setGrantCommission(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Extension Download Link (Optional / Auto-filled from Product)
                </label>
                <input
                  type="url"
                  style={inputStyle}
                  value={grantDownloadUrl}
                  onChange={(e) => setGrantDownloadUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or direct zip link"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setGrantModalData(null)} className="btn-secondary" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={grantingLicense} className="btn-primary" style={{ padding: '8px 20px' }}>
                  {grantingLicense ? 'Granting...' : '🚀 Grant Trial License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT COMMISSION RATE */}
      {editCommModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 99999 }}>
          <div style={{ ...cardStyle, maxWidth: '440px', width: '100%', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0' }}>
              ✏️ Edit Creator Commission
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Update commission for <strong>{editCommModal.name || editCommModal.email}</strong>.
            </p>

            <form onSubmit={handleUpdateCommission} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Percentage Commission Rate (% per sale)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.1"
                  style={inputStyle}
                  value={editCommModal.rate}
                  onChange={(e) => setEditCommModal({ ...editCommModal, rate: e.target.value })}
                  placeholder="20"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Or Fixed Cash Commission (₹ per sale, optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  style={inputStyle}
                  value={editCommModal.fixed}
                  onChange={(e) => setEditCommModal({ ...editCommModal, fixed: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditCommModal(null)} className="btn-secondary" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={processingEditComm} className="btn-primary" style={{ padding: '8px 20px' }}>
                  {processingEditComm ? 'Saving...' : '✓ Save Commission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MARK PAYOUT AS PAID */}
      {payoutModalPromoter && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 99999 }}>
          <div style={{ ...cardStyle, maxWidth: '460px', width: '100%', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0' }}>
              Record Creator Payout
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Paying commission to: <strong>{payoutModalPromoter.name}</strong> ({payoutModalPromoter.email})
            </p>

            <form onSubmit={handleRecordPayout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Payout Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  style={inputStyle}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Payment Method / UPI / Bank Ref Notes
                </label>
                <input
                  type="text"
                  style={inputStyle}
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                  placeholder="e.g. Paid via UPI ref #93821038"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setPayoutModalPromoter(null)} className="btn-secondary" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={processingPayout} className="btn-primary" style={{ padding: '8px 20px', background: '#10B981', border: 'none' }}>
                  {processingPayout ? 'Saving...' : '✓ Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KICK / BAN CREATOR CONFIRMATION */}
      {kickTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 99999 }}>
          <div style={{ ...cardStyle, maxWidth: '460px', width: '100%', background: 'var(--bg-secondary)', textAlign: 'center' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              margin: '0 auto 14px auto'
            }}>
              🚫
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', color: '#EF4444' }}>
              Kick & Remove Creator?
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.5 }}>
              Are you sure you want to kick <strong style={{ color: 'var(--text-primary)' }}>"{kickTarget.name || kickTarget.email}"</strong>?
              <br />
              This will <strong>instantly revoke all trial & permanent extension licenses</strong>, delete their custom affiliate coupons, and remove them from the collaboration program.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setKickTarget(null)}
                className="btn-secondary"
                style={{ flex: 1, padding: '11px', borderRadius: '10px' }}
                disabled={kickingPromoter}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteKick}
                disabled={kickingPromoter}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#EF4444',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                {kickingPromoter ? 'Kicking...' : '🚫 Yes, Kick Creator'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING IN-APP TOAST */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 100000,
          background: toast.type === 'error' ? '#EF4444' : '#0071e3',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '14px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.88rem',
          fontWeight: 600,
          animation: 'slideInRight 0.25s ease-out'
        }}>
          <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '0.85rem',
              marginLeft: '6px',
              opacity: 0.8
            }}
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
