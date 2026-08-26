'use client';
import { Suspense } from 'react';
import { useCustomLink } from '../context/CustomLinkContext';

export default function CustomLinkBanner() {
  const { activeCustomLink } = useCustomLink();

  if (!activeCustomLink) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
      color: 'white',
      textAlign: 'center',
      padding: '8px 16px',
      fontSize: '0.875rem',
      fontWeight: 500,
      position: 'relative',
      zIndex: 100
    }}>
      🎁 Special offer applied! {activeCustomLink.pricingMode === 'discount' ? `${activeCustomLink.discountPercent}% OFF` : 'Custom pricing unlocked!'}
    </div>
  );
}
