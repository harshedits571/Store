import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', padding: '64px 0 32px 0', marginTop: 'auto' }}>
      <div className="container">
        
        {/* Top Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '48px', marginBottom: '64px' }}>
          
          {/* Column 1: Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span className="h2 text-gradient" style={{ margin: 0 }}>Creative Store</span>
            <p className="text-secondary" style={{ fontSize: '0.875rem', lineHeight: '1.6', maxWidth: '300px' }}>
              Premium editing assets for creators. Level up your content game with our high-quality packs.
            </p>
          </div>

          {/* Column 2: Explore */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-primary)' }}>
              Explore
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Home</Link>
              <Link href="/products" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Catalog</Link>
              <Link href="/contact" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Contact</Link>
            </div>
          </div>

          {/* Column 3: Legal & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-primary)' }}>
              Legal & Info
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/privacy" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Privacy Policy</Link>
              <Link href="/terms" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Terms of Service</Link>
              <Link href="/refunds" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Refund Policy</Link>
              <Link href="/faq" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>FAQ</Link>
            </div>
          </div>
          
        </div>

        {/* Bottom Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingTop: '32px', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Creative Store. All rights reserved.
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Designed & developed by XH
          </span>
        </div>

      </div>
    </footer>
  );
}
