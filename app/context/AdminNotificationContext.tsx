'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

export interface SaleToast {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  itemsSummary: string;
  amount: number;
  currency: string;
  status: string;
  timestamp: Date;
}

interface AdminNotificationContextType {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  soundType: 'cash_register' | 'chime' | 'bell';
  setSoundType: (type: 'cash_register' | 'chime' | 'bell') => void;
  activeToasts: SaleToast[];
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  recentSalesHistory: SaleToast[];
  testNotification: () => void;
  playSaleSound: (type?: 'cash_register' | 'chime' | 'bell') => void;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);

// Web Audio API Sound Synthesizer
export function playSaleChime(type: 'cash_register' | 'chime' | 'bell' = 'cash_register') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === 'cash_register') {
      // Classic Cash Register 'Cha-Ching' + Sparkle
      // 1. Initial crisp register slide
      const oscClick = ctx.createOscillator();
      const gainClick = ctx.createGain();
      oscClick.type = 'triangle';
      oscClick.frequency.setValueAtTime(800, now);
      oscClick.frequency.exponentialRampToValueAtTime(1400, now + 0.05);
      gainClick.gain.setValueAtTime(0.3, now);
      gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      oscClick.connect(gainClick);
      gainClick.connect(ctx.destination);
      oscClick.start(now);
      oscClick.stop(now + 0.06);

      // 2. High metallic Bell Ding (B5 -> E6)
      const oscDing = ctx.createOscillator();
      const gainDing = ctx.createGain();
      oscDing.type = 'sine';
      oscDing.frequency.setValueAtTime(987.77, now + 0.05);
      oscDing.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12);
      gainDing.gain.setValueAtTime(0, now);
      gainDing.gain.setValueAtTime(0.45, now + 0.05);
      gainDing.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      oscDing.connect(gainDing);
      gainDing.connect(ctx.destination);
      oscDing.start(now + 0.05);
      oscDing.stop(now + 0.7);

      // 3. Shimmering Coins resonance (Gold coin sparkle)
      const coinFreqs = [1760, 2093, 2637, 3135, 3520];
      coinFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const start = now + 0.12 + idx * 0.04;
        osc.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(0.22, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.5);
      });
    } else if (type === 'bell') {
      // Warm modern bell
      const freqs = [880, 1174.66, 1760];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.35, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.8);
      });
    } else {
      // Smooth Glass Chime (C5, E5, G5, C6)
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.3, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.7);
      });
    }
  } catch (err) {
    console.warn('Audio notification error:', err);
  }
}

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();

  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [soundType, setSoundTypeState] = useState<'cash_register' | 'chime' | 'bell'>('cash_register');
  const [activeToasts, setActiveToasts] = useState<SaleToast[]>([]);
  const [recentSalesHistory, setRecentSalesHistory] = useState<SaleToast[]>([]);

  const isInitialLoadRef = useRef(true);
  const processedOrderIdsRef = useRef<Set<string>>(new Set());

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedNotif = localStorage.getItem('admin_sales_notifications');
      if (savedNotif !== null) setNotificationsEnabledState(savedNotif === 'true');

      const savedSound = localStorage.getItem('admin_sales_sound');
      if (savedSound !== null) setSoundEnabledState(savedSound === 'true');

      const savedSoundType = localStorage.getItem('admin_sales_sound_type');
      if (savedSoundType === 'cash_register' || savedSoundType === 'chime' || savedSoundType === 'bell') {
        setSoundTypeState(savedSoundType);
      }
    } catch (e) {
      console.warn('Could not read localStorage for notification preferences', e);
    }
  }, []);

  const setNotificationsEnabled = (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    try {
      localStorage.setItem('admin_sales_notifications', String(enabled));
    } catch {}
  };

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem('admin_sales_sound', String(enabled));
    } catch {}
  };

  const setSoundType = (type: 'cash_register' | 'chime' | 'bell') => {
    setSoundTypeState(type);
    try {
      localStorage.setItem('admin_sales_sound_type', type);
    } catch {}
  };

  const dismissToast = useCallback((id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setActiveToasts([]);
  }, []);

  const playSaleSound = useCallback((typeOverride?: 'cash_register' | 'chime' | 'bell') => {
    playSaleChime(typeOverride || soundType);
  }, [soundType]);

  // Push new sale alert
  const triggerSaleNotification = useCallback((sale: Omit<SaleToast, 'id' | 'timestamp'>) => {
    const toast: SaleToast = {
      ...sale,
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date(),
    };

    if (notificationsEnabled) {
      setActiveToasts(prev => [toast, ...prev.slice(0, 4)]); // Keep max 5 onscreen
      setRecentSalesHistory(prev => [toast, ...prev.slice(0, 19)]); // Keep 20 in history
    }

    if (soundEnabled && notificationsEnabled) {
      playSaleSound();
    }

    // Optional Browser Notification API
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && notificationsEnabled) {
      try {
        new Notification(`💰 New Sale: ₹${Number(sale.amount || 0).toLocaleString('en-IN')}`, {
          body: `${sale.customerName || sale.customerEmail} purchased ${sale.itemsSummary}`,
          icon: '/favicon.ico'
        });
      } catch {}
    }
  }, [notificationsEnabled, soundEnabled, playSaleSound]);

  // Test Notification Helper
  const testNotification = useCallback(() => {
    triggerSaleNotification({
      orderId: 'DEMO_' + Math.floor(100000 + Math.random() * 900000),
      customerName: 'Aarav Sharma',
      customerEmail: 'aarav.creative@gmail.com',
      itemsSummary: 'Markly Script For After Effects',
      amount: 100,
      currency: 'INR',
      status: 'verified'
    });
  }, [triggerSaleNotification]);

  // Real-time Firestore Listener for New Leads/Orders
  useEffect(() => {
    if (!user || !isAdmin) return;

    isInitialLoadRef.current = true;
    processedOrderIdsRef.current = new Set();

    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(25));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // On first load, seed the known IDs to avoid spamming alerts for historical orders
      if (isInitialLoadRef.current) {
        snapshot.docs.forEach(doc => {
          processedOrderIdsRef.current.add(doc.id);
        });
        isInitialLoadRef.current = false;
        return;
      }

      // Check document changes
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          const docId = change.doc.id;
          const data = change.doc.data();

          // Only alert if we haven't processed this order yet and it is verified/interested
          if (!processedOrderIdsRef.current.has(docId)) {
            processedOrderIdsRef.current.add(docId);

            const itemsArr = Array.isArray(data.items) ? data.items : [];
            const itemsSummary = itemsArr.length > 0
              ? itemsArr.map((item: any) => item.name || 'Digital Asset').join(', ')
              : (data.productName || 'Digital Product');

            const amount = Number(data.amount || 0);
            const currency = data.currency || (amount > 0 ? 'INR' : 'FREE');

            triggerSaleNotification({
              orderId: docId,
              customerName: data.name || data.customerName || '',
              customerEmail: data.email || data.customerEmail || 'Customer',
              itemsSummary: itemsSummary,
              amount: amount,
              currency: currency,
              status: data.status || 'verified'
            });
          }
        }
      });
    }, (err) => {
      console.warn('Leads notification listener warning:', err);
    });

    return () => unsubscribe();
  }, [user, isAdmin, triggerSaleNotification]);

  return (
    <AdminNotificationContext.Provider
      value={{
        notificationsEnabled,
        setNotificationsEnabled,
        soundEnabled,
        setSoundEnabled,
        soundType,
        setSoundType,
        activeToasts,
        dismissToast,
        clearAllToasts,
        recentSalesHistory,
        testNotification,
        playSaleSound
      }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotifications() {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    throw new Error('useAdminNotifications must be used within an AdminNotificationProvider');
  }
  return context;
}
