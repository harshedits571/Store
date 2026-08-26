'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './Navbar.module.css';

// SVG Icons
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7.008 7.008 0 0 1-7 7z" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 12a5 5 0 1 0-5-5 5.006 5.006 0 0 0 5 5zm0-8a3 3 0 1 1-3 3 3.003 3.003 0 0 1 3-3zm9 17v-1a7.008 7.008 0 0 0-7-7h-4a7.008 7.008 0 0 0-7 7v1a1 1 0 0 0 2 0v-1a5.006 5.006 0 0 1 5-5h4a5.006 5.006 0 0 1 5 5v1a1 1 0 0 0 2 0z" />
  </svg>
);

const CartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M20 7h-4V4c0-2.206-1.794-4-4-4S8 1.794 8 4v3H4a1 1 0 0 0-1 1v13c0 1.654 1.346 3 3 3h12c1.654 0 3-1.346 3-3V8a1 1 0 0 0-1-1zM10 4c0-1.103.897-2 2-2s2 .897 2 2v3h-4V4zm9 17c0 .551-.449 1-1 1H6c-.551 0-1-.449-1-1V9h3v2a1 1 0 0 0 2 0V9h4v2a1 1 0 0 0 2 0V9h3v12z" />
  </svg>
);

export default function Navbar() {
  const { cart, removeFromCart, isCartOpen, setCartOpen } = useCart();
  const { user, isAdmin, signInWithGoogle, logout } = useAuth();
  const { products, initialLoading } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Auto-remove deleted or out-of-stock items from cart
  useEffect(() => {
    if (mounted && !initialLoading && products.length > 0 && cart.length > 0) {
      const itemsToRemove: string[] = [];
      cart.forEach(item => {
        if (item.id === 'bundle') return;
        const product = products.find(p => p.id === item.id);
        if (!product) {
          itemsToRemove.push(item.id); // Product deleted
        } else {
          let targetData = product;
          if (product.hasVersions && item.versionId && product.versions) {
            const variant = product.versions.find((v: any) => v.id === item.versionId);
            if (variant) targetData = variant;
          }
          if (targetData.stockStatus === 'out_of_stock') {
            itemsToRemove.push(item.id); // Product or variant went out of stock
          }
        }
      });
      itemsToRemove.forEach(id => removeFromCart(id));
    }
  }, [initialLoading, products, mounted]); // Dependency on products will catch real-time updates

  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <div className={`${styles.navbarWrapper} ${scrolled ? styles.navbarWrapperScrolled : ''}`}>
        <nav className={styles.navbar}>
          <div className={styles.glassBackground} />

          {/* Left Logo */}
          <Link href="/" className={styles.navLogo}>
            <img src="/black.png" alt="Logo" />
          </Link>

          {/* Centered Links (like the reference) */}
          <div className={styles.navLinks}>
            <Link href="/" className={styles.navLink}>Home</Link>
            <Link href="/products" className={styles.navLink}>Catalog</Link>
            <Link href="/promoter/apply" className={styles.navLink} style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Promoter</Link>
            {user && <Link href="/dashboard" className={styles.navLink} style={{ color: '#3b82f6', fontWeight: 600 }}>Dashboard</Link>}
            {isAdmin && (
              <Link href="/admin" className={styles.navLink} style={{ color: '#f97316', fontWeight: 600 }}>Admin</Link>
            )}
          </div>

          {/* Right Icons & Hamburger Menu */}
          <div className={styles.navIcons}>
            <button className={styles.iconBtn} aria-label="Search">
              <SearchIcon />
            </button>

            {user ? (
              <Link href="/dashboard" className={styles.iconBtn} aria-label="Dashboard" style={{ position: 'relative' }}>
                <UserIcon />
                <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', backgroundColor: 'var(--success)', borderRadius: '50%', border: '2px solid var(--bg-glass)' }}></span>
              </Link>
            ) : (
              <button onClick={signInWithGoogle} className={styles.iconBtn} aria-label="Login">
                <UserIcon />
              </button>
            )}

            <button onClick={() => setCartOpen(!isCartOpen)} className={styles.iconBtn} aria-label="Cart">
              <CartIcon />
              {mounted && cart.length > 0 && (
                <span className={styles.cartBadge}>{cart.length}</span>
              )}
            </button>

            {/* Hamburger Menu Toggle (Mobile Only) */}
            <button
              className={styles.hamburger}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className={`${styles.bar} ${mobileMenuOpen ? styles.bar1 : ''}`}></span>
              <span className={`${styles.bar} ${mobileMenuOpen ? styles.bar2 : ''}`}></span>
              <span className={`${styles.bar} ${mobileMenuOpen ? styles.bar3 : ''}`}></span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Dropdown Menu */}
      <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
        <Link href="/" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Home</Link>
        <Link href="/products" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Catalog</Link>
        <Link href="/promoter/apply" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Be a Promoter</Link>
        {user ? (
          <>
            <Link href="/dashboard" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            {isAdmin && (
              <Link href="/admin" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--warning)' }}>Admin</Link>
            )}
            <button onClick={() => { logout(); setMobileMenuOpen(false); }} className={styles.mobileNavLink}>Logout</button>
          </>
        ) : (
          <button onClick={() => { signInWithGoogle(); setMobileMenuOpen(false); }} className={styles.mobileNavLink}>Sign In</button>
        )}
      </div>
    </>
  );
}
