'use client';
import { useState, useEffect } from 'react';

interface QuickReviewProps {
  productId: string;
  productName: string;
  userId?: string;
  userDisplayName?: string;
  userPhoto?: string;
  userEmail?: string;
  downloadUrl?: string;
  buttonText?: string;
  onDownload?: () => void;
  onClose?: () => void;
}

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];
const STAR_EMOJIS = ['', '😕', '🙂', '😊', '😃', '🤩'];

export default function QuickReview({
  productId,
  productName,
  userId,
  userDisplayName,
  userPhoto,
  userEmail,
  downloadUrl,
  buttonText = 'Download Asset',
  onDownload,
  onClose,
}: QuickReviewProps) {
  const [phase, setPhase] = useState<'prompt' | 'form' | 'done'>('prompt');
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Check if review already saved in localStorage or previously done
  useEffect(() => {
    try {
      const key = `reviewed_${productId}_${userId || 'guest'}`;
      if (localStorage.getItem(key)) {
        setPhase('done');
      }
    } catch (e) {
      // Ignore localStorage issues
    }
  }, [productId, userId]);

  const handleStarClick = (star: number) => {
    setRating(star);
    setPhase('form');
  };

  const handleSubmit = async (selectedRating?: number) => {
    const finalRating = selectedRating || rating;
    if (finalRating === 0) {
      setError('Please select a rating');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          productName,
          userId: userId || undefined,
          userName: userDisplayName || 'Verified Buyer',
          userPhoto: userPhoto || '',
          userEmail: userEmail || '',
          rating: finalRating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        try {
          localStorage.setItem(`reviewed_${productId}_${userId || 'guest'}`, 'true');
        } catch {}
        setPhase('done');
      } else {
        setError(data.error || 'Could not submit review. Please try again.');
      }
    } catch (e: any) {
      console.error('Review submit error:', e);
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hovered || rating;

  if (phase === 'done') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.25rem' }}>🌟</span>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#10B981' }}>Thank you for your rating!</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Your feedback helps the community.</div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'prompt') {
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '14px',
        padding: '14px 18px',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              flexShrink: 0
            }}>
              ⭐
            </div>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>Rate this Asset</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick 1-click rating for the creator</div>
            </div>
          </div>

          {/* Interactive Star Buttons */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.45rem',
                  padding: '0 2px',
                  lineHeight: 1,
                  color: activeRating >= star ? '#F59E0B' : 'var(--border-hover, rgba(150, 150, 150, 0.3))',
                  transition: 'color 0.15s ease, transform 0.1s ease',
                  transform: hovered === star ? 'scale(1.3)' : activeRating >= star ? 'scale(1.05)' : 'scale(1)',
                  filter: activeRating >= star ? 'drop-shadow(0 1px 4px rgba(245,158,11,0.4))' : 'none',
                }}
                aria-label={`Rate ${star} star`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
          paddingTop: '6px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <span style={{ fontWeight: 600, color: activeRating ? '#D97706' : 'var(--text-muted)' }}>
            {activeRating ? `${STAR_EMOJIS[activeRating]} ${STAR_LABELS[activeRating]}` : 'Tap a star to rate'}
          </span>
          <button
            type="button"
            onClick={() => setPhase('done')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              textDecoration: 'underline',
              padding: 0
            }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // Phase === 'form'
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '14px',
      padding: '16px',
      width: '100%',
      boxSizing: 'border-box',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'inline-flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.4rem',
                  padding: '0 2px',
                  lineHeight: 1,
                  color: rating >= star ? '#F59E0B' : 'var(--border-hover, rgba(150, 150, 150, 0.3))',
                  transition: 'transform 0.1s ease',
                  transform: rating >= star ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                ★
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {STAR_EMOJIS[rating]} {STAR_LABELS[rating]}
          </span>
        </div>
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share a quick thought or review... (optional)"
        maxLength={400}
        rows={2}
        style={{
          width: '100%',
          resize: 'none',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '10px 12px',
          fontSize: '0.84rem',
          fontFamily: 'inherit',
          color: 'var(--text-primary)',
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: '10px',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent-primary, #0071E3)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-subtle)';
        }}
      />

      {error && (
        <div style={{ fontSize: '0.75rem', color: '#EF4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => setPhase('done')}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={submitting}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            background: submitting ? 'var(--text-muted)' : 'linear-gradient(135deg, #0071E3 0%, #0051A8 100%)',
            color: '#FFFFFF',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: submitting ? 'none' : '0 2px 8px rgba(0, 113, 227, 0.3)',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {submitting ? 'Submitting…' : '✦ Post Review'}
        </button>
      </div>
    </div>
  );
}
