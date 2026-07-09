'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalLoader() {
  const [show, setShow] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Show for 1.5 seconds on every hard reload
    const timer = setTimeout(() => {
      setShow(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    // Return a static version for SSR to prevent hydration flash
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#09090b', // dark bg
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px', marginBottom: '24px' }}>
          Crevo Store
        </div>
        <div style={{ width: '200px', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px' }} />
      </div>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'var(--bg-primary)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)'
          }}
        >
          <div style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px', marginBottom: '24px' }}>
            Crevo Store
          </div>
          <div style={{
            width: '200px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              style={{
                height: '100%',
                background: 'var(--text-primary)',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
