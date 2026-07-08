'use client';
import { useEffect, useState } from 'react';
import Lenis from '@studio-freight/lenis';

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // Disable Lenis on touch/mobile devices — they already have native
    // momentum scrolling and Lenis can interfere with IntersectionObserver
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      // Still track scroll progress for the progress bar on mobile
      const handleScroll = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
          setScrollProgress((scrollTop / docHeight) * 100);
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }

    // Desktop: use Lenis for smooth scrolling
    const lenis = new Lenis({
      lerp: 0.1,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenis.on('scroll', (e: any) => {
      if (e.progress !== undefined) {
        setScrollProgress(e.progress * 100);
      }
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <div id="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />
      {children}
    </>
  );
}
