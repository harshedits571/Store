'use client';
import { useEffect } from 'react';

export default function VisitorTracker() {
  useEffect(() => {
    // Only count unique visits per browser session
    if (!sessionStorage.getItem('site_visited')) {
      sessionStorage.setItem('site_visited', 'true');
      fetch('/api/track-visitor', { method: 'POST' }).catch(console.error);
    }
  }, []);
  
  return null;
}
