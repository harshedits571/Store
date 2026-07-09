'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AdminProvider, useAdmin } from '../context/AdminContext';
import styles from './layout.module.css';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();
  const adminData = useAdmin();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        if (pathname !== '/admin/login') {
          router.push('/admin/login');
        }
        return;
      }

      // Strict Admin Check against Firestore
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.email || ''));
        
        if (!adminDoc.exists()) {
          await signOut(auth);
          setUser(null);
          setLoading(false);
          if (pathname !== '/admin/login') {
            router.push('/admin/login');
          }
          return;
        }
      } catch (e) {
        console.error("Admin check failed", e);
        await signOut(auth);
        setUser(null);
        setLoading(false);
        router.push('/admin/login');
        return;
      }

      setUser(currentUser);
      setLoading(false);
      
      if (pathname === '/admin/login') {
        router.push('/admin');
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  if (!loading && !user && pathname !== '/admin/login') {
    return null; 
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className="text-gradient h3">Admin Panel</span>
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/admin" className={styles.navItem}>Dashboard</Link>
          <Link href="/admin/products" className={styles.navItem}>Products</Link>
          <Link href="/admin/licenses" className={styles.navItem}>Licenses</Link>
          <Link href="/admin/orders" className={styles.navItem}>Leads / Orders</Link>
          <Link href="/admin/promos" className={styles.navItem}>Promo Codes</Link>
          <Link href="/admin/links" className={styles.navItem}>Custom Links</Link>
          <Link href="/admin/settings" className={styles.navItem}>Settings</Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.navItem}>← Back to Store</Link>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.topbar}>
          <div>Welcome, {user?.email}</div>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Logout</button>
        </div>
        <div className={styles.contentArea}>
          {(loading || adminData.initialLoading) && pathname !== '/admin/login' ? (
            <div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading Admin Data...</div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  );
}
