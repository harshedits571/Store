'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '../../context/AuthContext';

export default function PromoterApplyPage() {
  const { user, signInWithGoogle } = useAuth();

  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [platform, setPlatform] = useState('YouTube');
  const [channelUrl, setChannelUrl] = useState('');
  const [handle, setHandle] = useState('');
  const [audienceSize, setAudienceSize] = useState('1k-10k');
  const [niche, setNiche] = useState('Video Editing / VFX');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [pitch, setPitch] = useState('');
  const [expectedTurnaround, setExpectedTurnaround] = useState('7');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync user info if available
  React.useEffect(() => {
    if (user?.displayName && !name) setName(user.displayName);
    if (user?.email && !email) setEmail(user.email);
  }, [user, name, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !channelUrl.trim()) {
      setError('Please fill in your name, email, and primary social / channel link.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/promoter/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid || null,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          platform,
          channelUrl: channelUrl.trim(),
          handle: handle.trim(),
          audienceSize,
          niche,
          portfolioLink: portfolioLink.trim(),
          pitch: pitch.trim(),
          expectedTurnaroundDays: parseInt(expectedTurnaround, 10) || 7,
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit application.');
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting promoter application:', err);
      setError(err?.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '120px 24px 80px', background: 'var(--bg-primary)', position: 'relative' }}>
      {/* Background Ambient Glow */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(0, 102, 204, 0.12) 0%, rgba(168, 85, 247, 0.08) 50%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div className="container" style={{ maxWidth: '840px', position: 'relative', zIndex: 2 }}>
        
        {/* Top Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '40px' }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 102, 204, 0.1)',
            border: '1px solid rgba(0, 102, 204, 0.25)',
            color: 'var(--accent-primary)',
            padding: '6px 16px',
            borderRadius: '100px',
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '16px'
          }}>
            <span>✨ Crevo Creator & Promoter Program</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '16px' }}>
            Get Free Extension Access & Earn Sales Commissions
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
            Are you a YouTuber, video editor, or content creator? Review our pro extensions in your videos, get free permanent licenses, and earn generous commissions on every sale.
          </p>
        </motion.div>

        {/* Benefits Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '40px'
          }}
        >
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🎁</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Free Extension Access</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Get custom trial licenses to create tutorials & reviews. Keep them permanent upon publishing.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>💰</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Generous Commissions</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Earn custom percentage or fixed cash rewards whenever your audience buys through your link.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderRadius: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📊</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Real-Time Creator Hub</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Track live clicks, conversions, video approvals, and pending payouts on your personal dashboard.
            </p>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-panel"
          style={{ padding: '36px', borderRadius: '28px' }}
        >
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '2px solid #10B981',
                color: '#10B981',
                fontSize: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                ✓
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '10px' }}>
                Application Submitted Successfully!
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 28px', lineHeight: 1.6 }}>
                Thank you for applying to the Crevo Promoter Program! Our team reviews applications within 24-48 hours. Once approved, you will be able to request trial extension licenses and get your affiliate tracking link.
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/promoter/dashboard" className="btn-primary">
                  Go to Promoter Dashboard &rarr;
                </Link>
                <Link href="/" className="btn-secondary">
                  Back to Store
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, marginBottom: '4px' }}>
                  Creator Collaboration Application
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Fill in your details below so our team can approve your creator profile.
                </p>
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '0.88rem',
                  fontWeight: 600
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* 1. Personal & Contact Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Your Name / Creator Alias *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe / VFX Master"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              {/* 2. Platform & Channel URL */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Primary Social Platform
                  </label>
                  <select
                    className="input-field"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="YouTube">YouTube</option>
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Twitter/X">Twitter / X</option>
                    <option value="Website/Blog">Website / Blog</option>
                    <option value="Other">Other Community</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Channel / Profile URL *
                  </label>
                  <input
                    type="url"
                    required
                    className="input-field"
                    value={channelUrl}
                    onChange={(e) => setChannelUrl(e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                  />
                </div>
              </div>

              {/* 3. Audience Size & Niche */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Audience / Subscriber Size
                  </label>
                  <select
                    className="input-field"
                    value={audienceSize}
                    onChange={(e) => setAudienceSize(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="Under 1k">Under 1,000</option>
                    <option value="1k-10k">1,000 – 10,000</option>
                    <option value="10k-50k">10,000 – 50,000</option>
                    <option value="50k-100k">50,000 – 100,000</option>
                    <option value="100k+">100,000+</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Content Niche / Focus Area
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="Premiere Pro, After Effects, Motion Graphics..."
                  />
                </div>
              </div>

              {/* 4. Past Video / Portfolio link & Turnaround */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Sample Video / Portfolio Link
                  </label>
                  <input
                    type="url"
                    className="input-field"
                    value={portfolioLink}
                    onChange={(e) => setPortfolioLink(e.target.value)}
                    placeholder="https://youtu.be/example_video"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Estimated Days to Create & Upload Video
                  </label>
                  <select
                    className="input-field"
                    value={expectedTurnaround}
                    onChange={(e) => setExpectedTurnaround(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="3">3 Days (Fast Track)</option>
                    <option value="7">7 Days (1 Week)</option>
                    <option value="14">14 Days (2 Weeks)</option>
                    <option value="30">30 Days (1 Month)</option>
                  </select>
                </div>
              </div>

              {/* 5. Pitch / How will you promote */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  How do you plan to showcase the extension?
                </label>
                <textarea
                  className="input-field"
                  style={{ minHeight: '90px', resize: 'vertical' }}
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  placeholder="e.g. I will make a dedicated 5-minute tutorial on YouTube showing how this extension cuts editing time in half, with direct affiliate link in the description..."
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ padding: '14px 36px', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Submitting Application...' : '🚀 Submit Creator Application'}
                </button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Existing Promoter Login Prompt */}
        <div style={{ textAlign: 'center', marginTop: '28px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Already an approved promoter?{' '}
          <Link href="/promoter/dashboard" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'underline' }}>
            Open Creator Dashboard &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}
