'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { cart, isCartOpen, setCartOpen } = useCart();
  const { user, signInWithGoogle, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          <span className="text-gradient" style={{ fontSize: '20px', fontWeight: 700 }}>Creative Store</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/products" className={styles.navLink}>Products</Link>

          <button onClick={() => setCartOpen(!isCartOpen)} className={styles.navLink} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}>
            Cart
            {cart.length > 0 && (
              <span className={styles.cartBadge}>{cart.length}</span>
            )}
          </button>

          {user ? (
            <>
              <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
              <button onClick={logout} className={styles.navAction} style={{ borderColor: 'var(--border-hover)' }}>Logout</button>
            </>
          ) : (
            <button onClick={signInWithGoogle} className={styles.navActionPrimary}>Sign In</button>
          )}
        </div>

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

      {/* Mobile Dropdown Menu */}
      <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
        <Link href="/products" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Products</Link>
        <button onClick={() => { setCartOpen(true); setMobileMenuOpen(false); }} className={styles.mobileNavLink}>
          Cart {cart.length > 0 ? `(${cart.length})` : ''}
        </button>
        {user ? (
          <>
            <Link href="/dashboard" className={styles.mobileNavLink} onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            <button onClick={() => { logout(); setMobileMenuOpen(false); }} className={styles.mobileNavLink}>Logout</button>
          </>
        ) : (
          <button onClick={() => { signInWithGoogle(); setMobileMenuOpen(false); }} className={styles.mobileNavLink}>Sign In</button>
        )}
      </div>
    </nav>
  );
}
