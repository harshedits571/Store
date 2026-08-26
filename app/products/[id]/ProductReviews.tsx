'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './Reviews.module.css';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  userEmail?: string;
  rating: number;
  comment: string;
  createdAt: any;
  verifiedPurchase?: boolean;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`${styles.star} ${(hovered || value) >= star ? styles.starFilled : ''}`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          disabled={readonly}
          aria-label={`${star} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  // Load reviews via API
  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
        if (user) {
          setHasReviewed(data.reviews.some((r: Review) => r.userId === user.uid || (user.email && r.userEmail === user.email)));
        }
      }
    } catch (e) {
      console.error('Error loading reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a star rating.');
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
          userId: user?.uid || undefined,
          userName: user?.displayName || user?.email?.split('@')[0] || 'Verified Buyer',
          userPhoto: user?.photoURL || '',
          userEmail: user?.email || '',
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRating(5);
        setComment('');
        setHasReviewed(true);
        await loadReviews();
      } else {
        setError(data.error || 'Failed to submit review. Please try again.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async (reviewId: string) => {
    if (editRating === 0) return;
    try {
      const res = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          rating: editRating,
          comment: editComment.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        await loadReviews();
      }
    } catch (e) {
      console.error('Error updating review:', e);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete your review?')) return;
    try {
      const res = await fetch(`/api/reviews?reviewId=${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setHasReviewed(false);
        await loadReviews();
      }
    } catch (e) {
      console.error('Error deleting review:', e);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className={styles.reviewsSection}>
      {/* Header */}
      <div className={styles.reviewsHeader}>
        <div>
          <h2 className={styles.reviewsTitle}>
            Customer Reviews
            {reviews.length > 0 && <span className={styles.reviewsCount}>{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>}
          </h2>
          {avgRating && (
            <div className={styles.avgRating}>
              <span className={styles.avgNumber}>{avgRating.toFixed(1)}</span>
              <StarRating value={Math.round(avgRating)} readonly />
              <span className={styles.avgLabel}>out of 5</span>
            </div>
          )}
        </div>

        {/* Rating breakdown bars */}
        {reviews.length > 0 && (
          <div className={styles.ratingBreakdown}>
            {ratingDistribution.map(({ star, count, pct }) => (
              <div key={star} className={styles.ratingBar}>
                <span className={styles.ratingBarLabel}>{star}★</span>
                <div className={styles.ratingBarTrack}>
                  <div className={styles.ratingBarFill} style={{ width: `${pct}%` }} />
                </div>
                <span className={styles.ratingBarCount}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Write a review */}
      {!hasReviewed ? (
        <form className={styles.reviewForm} onSubmit={handleSubmit}>
          <h3 className={styles.formTitle}>Write a Review</h3>
          <p className={styles.formSubtitle}>Share your honest feedback with the creator and community</p>
          <div className={styles.formRatingRow}>
            <span className={styles.formLabel}>Your Rating</span>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <textarea
            className={styles.formTextarea}
            placeholder="What did you think of this product? How did it help your workflow?"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className={styles.formFooter}>
            {error && <span className={styles.formError}>{error}</span>}
            <span className={styles.charCount}>{comment.length}/500</span>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Posting…' : '✦ Post Review'}
          </button>
        </form>
      ) : (
        <div className={styles.alreadyReviewed}>✓ You&apos;ve reviewed this product. You can edit or delete your review below.</div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className={styles.emptyReviews}>
          <span className={styles.emptyIcon}>✦</span>
          <p>No reviews yet. Be the first to share your experience!</p>
        </div>
      ) : (
        <div className={styles.reviewsList}>
          {reviews.map(review => {
            const isAuthor = user && (review.userId === user.uid || (user.email && review.userEmail === user.email));

            return (
              <div key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewTop}>
                  <div className={styles.reviewUser}>
                    {review.userPhoto ? (
                      <img src={review.userPhoto} alt={review.userName} className={styles.userAvatar} referrerPolicy="no-referrer" />
                    ) : (
                      <div className={styles.userAvatarFallback}>{review.userName?.[0]?.toUpperCase() || 'U'}</div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={styles.userName}>{review.userName}</span>
                        {review.verifiedPurchase && (
                          <span style={{ fontSize: '0.7rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Verified
                          </span>
                        )}
                      </div>
                      <div className={styles.reviewDate}>{formatDate(review.createdAt)}</div>
                    </div>
                  </div>
                  <StarRating value={review.rating} readonly />
                </div>

                {editingId === review.id ? (
                  <div className={styles.editForm}>
                    <StarRating value={editRating} onChange={setEditRating} />
                    <textarea
                      className={styles.formTextarea}
                      value={editComment}
                      onChange={e => setEditComment(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                    <div className={styles.editActions}>
                      <button onClick={() => handleEditSave(review.id)} className={styles.saveBtn}>Save Changes</button>
                      <button onClick={() => setEditingId(null)} className={styles.cancelBtn}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  review.comment && <p className={styles.reviewComment}>{review.comment}</p>
                )}

                {isAuthor && editingId !== review.id && (
                  <div className={styles.reviewActions}>
                    <button onClick={() => { setEditingId(review.id); setEditRating(review.rating); setEditComment(review.comment || ''); }} className={styles.editBtn}>Edit</button>
                    <button onClick={() => handleDelete(review.id)} className={styles.deleteBtn}>Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
