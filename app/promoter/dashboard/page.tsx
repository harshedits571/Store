'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  getDocs,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useCurrency } from '../../context/CurrencyContext';

// Countdown Timer Component
function CountdownBadge({ targetDate }: { targetDate: string | any }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false
  });

  useEffect(() => {
    if (!targetDate) return;
    const calculateTime = () => {
      const expMs = targetDate.seconds ? targetDate.seconds * 1000 : new Date(targetDate).getTime();
      const diff = expMs - Date.now();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return (
      <span style={{
        background: 'rgba(239, 68, 68, 0.12)',
        color: '#EF4444',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        padding: '4px 10px',
        borderRadius: '100px',
        fontSize: '0.75rem',
        fontWeight: 700
      }}>
        ⌛ Trial Expired
      </span>
    );
  }

  return (
    <span style={{
      background: 'rgba(245, 158, 11, 0.12)',
      color: '#D97706',
      border: '1px solid rgba(245, 158, 11, 0.25)',
      padding: '4px 10px',
      borderRadius: '100px',
      fontSize: '0.75rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <span>⏳</span>
      <span>{timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s remaining</span>
    </span>
  );
}

export default function PromoterDashboardPage() {
  const { user, signInWithGoogle } = useAuth();
  const { products } = useStore();
  const { formatPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState<'my_extensions' | 'request_extension' | 'earnings'>('my_extensions');
  const [promoterProfile, setPromoterProfile] = useState<any>(null);
  const [grants, setGrants] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [proofModalGrant, setProofModalGrant] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  const [requestModalProduct, setRequestModalProduct] = useState<any>(null);
  const [requestTurnaround, setRequestTurnaround] = useState('7');
  const [requestPitch, setRequestPitch] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedCustomProduct, setSelectedCustomProduct] = useState<string>('');
  const [copiedCustomProductLink, setCopiedCustomProductLink] = useState(false);
  const [copiedPromoSnippet, setCopiedPromoSnippet] = useState(false);

  // In-app Toast notification
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch promoter data from Server Admin API
  const fetchPromoterData = async () => {
    if (!user?.email) return;
    try {
      const cleanEmail = user.email.trim().toLowerCase();
      const res = await fetch(`/api/promoter/data?email=${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.promoterProfile) setPromoterProfile(data.promoterProfile);
          if (Array.isArray(data.grants)) setGrants(data.grants);
          if (Array.isArray(data.commissions)) setCommissions(data.commissions);
          if (Array.isArray(data.payouts)) setPayouts(data.payouts);
          if (Array.isArray(data.requests)) setRequests(data.requests);
        }
      }
    } catch (e) {
      console.warn('Error fetching promoter data from API:', e);
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch promoter profile & grants for current user
  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    fetchPromoterData();

    // Auto-refresh when creator focuses back on the tab
    const handleFocus = () => {
      fetchPromoterData();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    const cleanEmail = user.email.trim().toLowerCase();

    // Query promoter account by email
    const qPromoters = query(collection(db, 'promoters'), where('email', '==', cleanEmail));
    const unsubPromoter = onSnapshot(qPromoters, (snap) => {
      if (!snap.empty) {
        setPromoterProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    }, () => {});

    // Query granted licenses
    const qGrants = query(collection(db, 'promoter_grants'), where('promoterEmail', '==', cleanEmail));
    const unsubGrants = onSnapshot(qGrants, (snap) => {
      if (!snap.empty) {
        const gList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setGrants(gList);
      }
    }, () => {});

    // Query commission sales
    const qCommissions = query(collection(db, 'promoter_commissions'), where('promoterEmail', '==', cleanEmail));
    const unsubCommissions = onSnapshot(qCommissions, (snap) => {
      if (!snap.empty) {
        const cList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        cList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setCommissions(cList);
      }
    }, () => {});

    // Query pending product requests
    const qRequests = query(collection(db, 'promoter_requests'), where('promoterEmail', '==', cleanEmail));
    const unsubRequests = onSnapshot(qRequests, (snap) => {
      if (!snap.empty) {
        const rList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRequests(rList);
      }
    }, () => {});

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
      unsubPromoter();
      unsubGrants();
      unsubCommissions();
      unsubRequests();
    };
  }, [user]);

  // Submit proof of video / post
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofModalGrant || !proofUrl.trim()) return;

    setSubmittingProof(true);
    try {
      const res = await fetch('/api/promoter/submit-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantId: proofModalGrant.id,
          proofUrl: proofUrl.trim(),
          proofNotes: proofNotes.trim(),
          email: user?.email,
          name: user?.displayName || promoterProfile?.name
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit proof.');
      }

      setProofModalGrant(null);
      setProofUrl('');
      setProofNotes('');
      showToast('Promotion proof submitted! Our team will review your link and convert your license to permanent.', 'success');
      fetchPromoterData();
    } catch (err: any) {
      console.error('Error submitting proof:', err);
      showToast('Failed to submit proof: ' + (err?.message || 'Please try again.'), 'error');
    } finally {
      setSubmittingProof(false);
    }
  };

  // Submit extension promotion request
  const handleRequestExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModalProduct || !user?.email) return;

    setSubmittingRequest(true);
    try {
      const res = await fetch('/api/promoter/request-extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.displayName || promoterProfile?.name,
          productId: requestModalProduct.id,
          productName: requestModalProduct.name,
          productCategory: requestModalProduct.category || 'Plugin',
          expectedTurnaroundDays: parseInt(requestTurnaround, 10) || 7,
          pitch: requestPitch.trim(),
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send request.');
      }

      setRequestModalProduct(null);
      setRequestPitch('');
      showToast('Extension request sent to admin! You will see it under My Extensions once granted.', 'success');
      fetchPromoterData();
    } catch (err: any) {
      console.error('Error requesting extension:', err);
      showToast('Failed to send request: ' + (err?.message || 'Please try again.'), 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'link' | 'code', id?: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'key' && id) {
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2500);
    } else if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const referralCode = promoterProfile?.referralCode || (user?.email ? user.email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '') : 'CREATOR10');
  const referralUrl = typeof window !== 'undefined' ? `${window.location.origin}?ref=${referralCode}` : `https://crevostore.com?ref=${referralCode}`;

  const totalEarned = commissions.reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);
  const totalPaidByPayouts = payouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPaid = Math.max(
    totalPaidByPayouts,
    Number(promoterProfile?.totalPaid) || 0,
    commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0)
  );
  const pendingPayout = Math.max(0, totalEarned - totalPaid);
  const totalSalesCount = commissions.length;

  if (!user) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px' }}>
        <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '40px', borderRadius: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>👑</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '10px' }}>Creator / Promoter Portal</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: 1.5 }}>
            Sign in with your registered creator account to view your active trial licenses, submit video proofs, and track your affiliate commissions.
          </p>
          <button onClick={signInWithGoogle} className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}>
            Sign In with Google &rarr;
          </button>
          <div style={{ marginTop: '20px' }}>
            <Link href="/promoter/apply" style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              Not a promoter yet? Apply to join &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '120px 24px 80px', background: 'var(--bg-primary)', position: 'relative' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* IN-APP FLOATING TOAST */}
        {toast && (
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 99999,
            background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${toast.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
            color: toast.type === 'success' ? '#065F46' : '#991B1B',
            padding: '14px 22px',
            borderRadius: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <span style={{ fontSize: '1.1rem' }}>{toast.type === 'success' ? '✓' : '✕'}</span>
            <span>{toast.msg}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="glass-panel" style={{ padding: '28px 32px', borderRadius: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0071E3, #8B5CF6)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(0, 113, 227, 0.3)',
              overflow: 'hidden',
              flexShrink: 0,
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Creator'}
                  referrerPolicy="no-referrer"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    // Fallback to initial if image fails
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                user.displayName ? user.displayName.charAt(0).toUpperCase() : 'C'
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                  {user.displayName || 'Creator Dashboard'}
                </h1>
                <span style={{
                  background: (promoterProfile?.status === 'approved' || grants.length > 0) ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: (promoterProfile?.status === 'approved' || grants.length > 0) ? '#10B981' : '#D97706',
                  border: `1px solid ${(promoterProfile?.status === 'approved' || grants.length > 0) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  padding: '2px 10px',
                  borderRadius: '100px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  {(promoterProfile?.status === 'approved' || grants.length > 0) ? '✓ Verified Promoter' : '🟡 Application Under Review'}
                </span>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {user.email} • Your Commission: <strong style={{ color: 'var(--accent-primary)' }}>
                  {promoterProfile?.commissionRate !== undefined && promoterProfile?.commissionRate !== null
                    ? `${promoterProfile.commissionRate}% per sale`
                    : (promoterProfile?.fixedCommission ? `₹${promoterProfile.fixedCommission}/sale` : (grants[0]?.commissionRate !== undefined ? `${grants[0].commissionRate}% per sale` : '20% per sale'))}
                </strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/promoter/apply" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
              Update Profile
            </Link>
            <Link href="/products" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
              Browse Store
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'my_extensions', label: `📦 My Extensions (${grants.length})` },
            { id: 'request_extension', label: '➕ Request Extension to Promote' },
            { id: 'earnings', label: `💰 Sales & Earnings (${commissions.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                background: activeTab === tab.id ? 'var(--text-primary)' : 'var(--bg-glass)',
                color: activeTab === tab.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                boxShadow: activeTab === tab.id ? 'var(--shadow-md)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: MY EXTENSIONS & TRIAL LICENSES */}
        {activeTab === 'my_extensions' && (
          <div>
            {grants.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px 24px', borderRadius: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '14px', opacity: 0.4 }}>📦</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>No Granted Extensions Yet</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 24px' }}>
                  Browse our product catalog and request any extension you would like to promote. Once approved, your temporary license and download link will appear here!
                </p>
                <button onClick={() => setActiveTab('request_extension')} className="btn-primary">
                  Request an Extension to Review &rarr;
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {grants.map((grant) => {
                  const isPermanent = grant.status === 'approved_permanent' || grant.isPermanent;
                  const isSubmitted = grant.status === 'proof_submitted';
                  const isRevoked = grant.status === 'revoked';

                  const matchedProduct = products.find(p => p.id === grant.productId || p.name?.toLowerCase() === grant.productName?.toLowerCase());
                  const category = (grant.productCategory || matchedProduct?.category || '').toLowerCase();
                  const isSoftwarePlugin = matchedProduct?.requiresLicense !== false && (
                    category.includes('plugin') || 
                    category.includes('script') || 
                    category.includes('extension') || 
                    category.includes('tool') ||
                    grant.productName?.toLowerCase().includes('script') ||
                    grant.productName?.toLowerCase().includes('plugin') ||
                    grant.productName?.toLowerCase().includes('box')
                  ) && !category.includes('asset') && !category.includes('file') && !category.includes('template');

                  return (
                    <motion.div
                      key={grant.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-panel"
                      style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}
                    >
                      {/* Top Row: Title & Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
                            {grant.productCategory || (isSoftwarePlugin ? 'Extension' : 'Asset Pack')}
                          </span>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '2px 0 0 0' }}>
                            {grant.productName}
                          </h3>
                        </div>

                        <div>
                          {isPermanent ? (
                            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700 }}>
                              ✓ Permanent Active
                            </span>
                          ) : isSubmitted ? (
                            <span style={{ background: 'rgba(0, 113, 227, 0.12)', color: '#0071E3', border: '1px solid rgba(0, 113, 227, 0.25)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700 }}>
                              🔍 In Review
                            </span>
                          ) : isRevoked ? (
                            <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700 }}>
                              ✕ Deactivated
                            </span>
                          ) : (
                            <CountdownBadge targetDate={grant.expiresAt} />
                          )}
                        </div>
                      </div>

                      {/* Content Box: License Credentials for Plugins VS Asset Package info for Project Files */}
                      {isSoftwarePlugin ? (
                        <div style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '14px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          {/* Email Row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                Registered Activation Email
                              </div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {user.email}
                              </div>
                            </div>
                            <button
                              onClick={() => copyToClipboard(user.email || '', 'link')}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: 'var(--bg-glass)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Copy Email
                            </button>
                          </div>

                          {/* License Key Row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                            <div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                {isPermanent ? 'Permanent Lifetime License Key' : 'Temporary Trial License Key'}
                              </div>
                              <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.05em', color: 'var(--accent-primary)' }}>
                                {grant.licenseKey || 'CREVO-PROMO-XXXX'}
                              </div>
                            </div>

                            <button
                              onClick={() => copyToClipboard(grant.licenseKey, 'key', grant.id)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                background: copiedKey === grant.id ? '#10B981' : 'var(--text-primary)',
                                color: copiedKey === grant.id ? '#fff' : 'var(--bg-primary)',
                                border: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {copiedKey === grant.id ? '✓ Copied' : 'Copy Key'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '14px',
                          padding: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'rgba(0, 113, 227, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.4rem'
                          }}>
                            📁
                          </div>
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              Project Assets / Source Files
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              No license key needed • Ready-to-use project package
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Info & Requirements */}
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {isPermanent ? (
                          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '10px 12px', color: '#10B981', fontWeight: 600 }}>
                            🎉 <strong>Promotion Approved!</strong> Content approved with permanent lifetime ownership.
                          </div>
                        ) : isSubmitted ? (
                          <div style={{ background: 'rgba(0, 113, 227, 0.08)', border: '1px solid rgba(0, 113, 227, 0.2)', borderRadius: '10px', padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: '#0071E3', marginBottom: '4px' }}>🔍 Proof Submitted & Under Review:</div>
                            <a href={grant.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                              {grant.proofUrl}
                            </a>
                            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Admin is checking your video. Your access remains active while under review.
                            </div>
                          </div>
                        ) : (
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '10px 12px' }}>
                            <strong>⏱️ Upload Rule:</strong> Create & upload your video/post showcasing this {isSoftwarePlugin ? 'extension' : 'project file'} before the timer ends. Once uploaded, submit your link below to approve your access!
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {(() => {
                        const downloadLink = grant.downloadUrl || matchedProduct?.versions?.[0]?.downloadUrl || matchedProduct?.downloadUrl || matchedProduct?.fileUrl;

                        return (
                          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', flexWrap: 'wrap' }}>
                            {downloadLink && (
                              <a
                                href={downloadLink}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-secondary"
                                style={{ flex: 1, minWidth: '140px', padding: '10px', fontSize: '0.82rem', textAlign: 'center' }}
                              >
                                {isSoftwarePlugin ? '⬇️ Download Extension' : '⬇️ Download Project Files'}
                              </a>
                            )}

                            {!isPermanent && !isRevoked && (
                              <button
                                onClick={() => {
                                  setProofModalGrant(grant);
                                  setProofUrl(grant.proofUrl || '');
                                  setProofNotes(grant.proofNotes || '');
                                }}
                                className="btn-primary"
                                style={{ flex: 1, minWidth: '160px', padding: '10px', fontSize: '0.82rem' }}
                              >
                                {isSubmitted ? '✏️ Update Proof Video Link' : '🚀 Submit Video Proof'}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REQUEST EXTENSION TO PROMOTE */}
        {activeTab === 'request_extension' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px 0' }}>Request Extensions to Review</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Select any extension below to request free review access. Once admin approves, you will receive a temporary license to create your content.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {products.map((product) => {
                const alreadyGranted = grants.some(g => g.productId === product.id && g.status !== 'revoked');
                const pendingRequest = requests.some(r => r.productId === product.id && r.status === 'pending');

                return (
                  <div
                    key={product.id}
                    className="glass-panel"
                    style={{ padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                        {product.category}
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{product.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {product.description}
                    </p>

                    <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                      {alreadyGranted ? (
                        <button disabled className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '0.8rem', opacity: 0.6, cursor: 'default' }}>
                          ✓ In Your Extensions
                        </button>
                      ) : pendingRequest ? (
                        <button disabled className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '0.8rem', opacity: 0.7, color: '#F59E0B' }}>
                          ⏳ Request Pending Admin Review
                        </button>
                      ) : (
                        <button
                          onClick={() => setRequestModalProduct(product)}
                          className="btn-primary"
                          style={{ width: '100%', padding: '8px', fontSize: '0.82rem' }}
                        >
                          Request Promotion Access &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SALES & EARNINGS */}
        {activeTab === 'earnings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Referral Tracking Card */}
            <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                    🔗 Your Creator Affiliate Link & Coupon
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Share this unique link or promo code in your video descriptions and social bios. Every sale tracked generates instant commissions.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => copyToClipboard(referralUrl, 'link')}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                  >
                    {copiedLink ? '✓ Link Copied!' : '📋 Copy Affiliate Link'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 16px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Store Tracking URL</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)', wordBreak: 'break-all', marginTop: '2px' }}>
                    {referralUrl}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Audience Promo Code</span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {referralCode}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(referralCode, 'code')}
                    style={{ padding: '4px 10px', borderRadius: '6px', background: copiedCode ? '#10B981' : 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: copiedCode ? '#fff' : 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {copiedCode ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Easy-Peasy Custom Product Affiliate Hub */}
            <div className="glass-panel" style={{ padding: '28px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.4rem' }}>🎯</span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                      Product Direct Affiliate Links
                    </h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Click any product to copy its direct link or video description template with your promo tracking.
                  </p>
                </div>
              </div>

              {/* Product Search & Filter Bar */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Search product (e.g. Creativebox, Real Estate, Script)..."
                    value={selectedCustomProduct}
                    onChange={(e) => setSelectedCustomProduct(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  {selectedCustomProduct && (
                    <button
                      onClick={() => setSelectedCustomProduct('')}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Product Grid */}
              {(() => {
                const searchLow = selectedCustomProduct.toLowerCase().trim();
                const filteredProducts = products.filter(p => {
                  if (!searchLow) return true;
                  return p.name?.toLowerCase().includes(searchLow) || p.category?.toLowerCase().includes(searchLow);
                });

                const currentCommRate = promoterProfile?.commissionRate !== undefined && promoterProfile?.commissionRate !== null
                  ? Number(promoterProfile.commissionRate)
                  : (grants[0]?.commissionRate !== undefined ? Number(grants[0].commissionRate) : 20);

                if (filteredProducts.length === 0) {
                  return (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '16px' }}>
                      No products found matching "{selectedCustomProduct}". Try another keyword!
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredProducts.map((p) => {
                      const directProdUrl = typeof window !== 'undefined'
                        ? `${window.location.origin}/products/${p.id}?ref=${referralCode}`
                        : `https://crevostore.com/products/${p.id}?ref=${referralCode}`;

                      const inrPrice = p.inrPrice || (p.price ? p.price * 84 : 0);
                      const estimatedEarning = Math.round(inrPrice * (currentCommRate / 100));
                      const isCopied = copiedCustomProductLink === p.id;

                      return (
                        <div
                          key={p.id}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '16px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.04em' }}>
                                {p.category || 'Asset'}
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', padding: '2px 8px', borderRadius: '100px' }}>
                                {inrPrice > 0 ? `💰 Earn ~₹${estimatedEarning}` : 'Free Asset'}
                              </span>
                            </div>

                            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 4px 0', lineHeight: 1.35 }}>
                              {p.name}
                            </h4>

                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                              {inrPrice > 0 ? `₹${inrPrice}` : 'Free Download'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(directProdUrl);
                                setCopiedCustomProductLink(p.id as any);
                                setTimeout(() => setCopiedCustomProductLink(false as any), 2500);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '10px',
                                background: isCopied ? '#10B981' : 'var(--text-primary)',
                                color: isCopied ? '#fff' : 'var(--bg-primary)',
                                border: 'none',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'center'
                              }}
                            >
                              {isCopied ? '✓ Link Copied!' : '📋 Copy Link'}
                            </button>

                            <button
                              onClick={() => {
                                const caption = `🔥 Get ${p.name} with 10% Discount: ${directProdUrl} (Use Code: ${referralCode})`;
                                navigator.clipboard.writeText(caption);
                                setCopiedPromoSnippet(p.id as any);
                                setTimeout(() => setCopiedPromoSnippet(false as any), 2500);
                              }}
                              title="Copy ready-to-paste caption for video description"
                              style={{
                                padding: '8px 12px',
                                borderRadius: '10px',
                                background: copiedPromoSnippet === (p.id as any) ? '#10B981' : 'var(--bg-glass)',
                                color: copiedPromoSnippet === (p.id as any) ? '#fff' : 'var(--text-primary)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {copiedPromoSnippet === (p.id as any) ? '✓ Caption' : '💬 Caption'}
                            </button>

                            <a
                              href={`/products/${p.id}?ref=${referralCode}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Preview product page"
                              style={{
                                padding: '8px 10px',
                                borderRadius: '10px',
                                background: 'var(--bg-glass)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textDecoration: 'none'
                              }}
                            >
                              🔗
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>


            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Units Sold</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {totalSalesCount}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Earned</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                  ₹{totalEarned.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Payout</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>
                  ₹{pendingPayout.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Paid to You</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
                  ₹{totalPaid.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Sales Table */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Commission Sales History</h3>

              {commissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No sales recorded yet. Share your affiliate link in videos to start generating commissions!
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px 12px' }}>Date</th>
                        <th style={{ padding: '10px 12px' }}>Product</th>
                        <th style={{ padding: '10px 12px' }}>Order Total</th>
                        <th style={{ padding: '10px 12px' }}>Commission</th>
                        <th style={{ padding: '10px 12px' }}>Payout Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{c.productName || 'Extension Order'}</td>
                          <td style={{ padding: '12px' }}>₹{Number(c.orderAmount || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#10B981' }}>
                            +₹{Number(c.commissionAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '100px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: c.status === 'paid' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: c.status === 'paid' ? '#10B981' : '#D97706'
                            }}>
                              {c.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payout Receipts & Payment History */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0' }}>
                    🧾 Payout Receipts & Payment History
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Official settlement receipts recorded by store admin for your GPay / UPI / Bank payouts.
                  </p>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', padding: '4px 10px', borderRadius: '100px' }}>
                  Total Received: ₹{totalPaid.toLocaleString('en-IN')}
                </span>
              </div>

              {payouts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-secondary)', fontSize: '0.88rem', background: 'var(--bg-secondary)', borderRadius: '14px' }}>
                  No payout transactions recorded yet. When admin transfers your commission via GPay / UPI, your payment receipt and reference will appear here!
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px 12px' }}>Date & Time</th>
                        <th style={{ padding: '10px 12px' }}>Amount Paid</th>
                        <th style={{ padding: '10px 12px' }}>Payment Mode / Ref Note</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px' }}>
                            {p.paidAt ? new Date(p.paidAt).toLocaleString() : 'Recent'}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#10B981', fontSize: '0.95rem' }}>
                            +₹{Number(p.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                            {p.notes || 'Transferred via GPay / UPI / Bank'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '100px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#10B981',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                              ✅ Transferred & Settled
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* MODAL: SUBMIT PROMOTION PROOF */}
      <AnimatePresence>
        {proofModalGrant && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 99999
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel"
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '24px',
                padding: '32px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                color: 'var(--text-primary)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Submit Promotion Proof
                </h3>
                <button
                  onClick={() => setProofModalGrant(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Paste the direct link to your published YouTube video, Instagram Reel, TikTok, or blog post featuring <strong>{proofModalGrant.productName}</strong>.
              </p>

              <form onSubmit={handleSubmitProof} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Live Video / Post URL *
                  </label>
                  <input
                    type="url"
                    required
                    className="input-field"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or https://instagram.com/reel/..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Notes / Timestamps (Optional)
                  </label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '70px', resize: 'vertical' }}
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    placeholder="e.g. Extension featured from 01:45 to 04:30. Affiliate link added in top comment."
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setProofModalGrant(null)}
                    className="btn-secondary"
                    style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingProof}
                    className="btn-primary"
                    style={{ padding: '10px 24px', fontSize: '0.9rem' }}
                  >
                    {submittingProof ? 'Submitting...' : '🚀 Submit for Approval'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REQUEST EXTENSION */}
      <AnimatePresence>
        {requestModalProduct && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 99999
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel"
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '24px',
                padding: '32px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                color: 'var(--text-primary)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Request Review License
                </h3>
                <button
                  onClick={() => setRequestModalProduct(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Requesting free promotion trial access for: <strong>{requestModalProduct.name}</strong>
              </p>

              <form onSubmit={handleRequestExtension} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    How soon will you upload the video/post?
                  </label>
                  <select
                    className="input-field"
                    value={requestTurnaround}
                    onChange={(e) => setRequestTurnaround(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="3">Within 3 Days</option>
                    <option value="7">Within 7 Days (1 Week)</option>
                    <option value="14">Within 14 Days (2 Weeks)</option>
                    <option value="30">Within 30 Days (1 Month)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Promotion Idea / Plan
                  </label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    value={requestPitch}
                    onChange={(e) => setRequestPitch(e.target.value)}
                    placeholder="e.g. I will include this in my 'Top 5 Premiere Pro Plugins for 2026' video..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setRequestModalProduct(null)}
                    className="btn-secondary"
                    style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="btn-primary"
                    style={{ padding: '10px 24px', fontSize: '0.9rem' }}
                  >
                    {submittingRequest ? 'Sending...' : '🚀 Send Request to Admin'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
