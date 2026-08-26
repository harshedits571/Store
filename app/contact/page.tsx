import LegalLayout from '../components/LegalLayout';

export default function ContactPage() {
  return (
    <LegalLayout title="Contact & Community">
      <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
          We would love to hear from you! Whether you have a question about our editing assets, need license support, or want to connect with our creator community, we&apos;re here for you.
        </p>

        {/* Email Box */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          padding: '28px 32px', 
          borderRadius: '16px', 
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '28px'
        }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--accent-primary)', display: 'block', marginBottom: '8px' }}>
            Official Email Support
          </span>
          <a 
            href="mailto:hello.creativestore@gmail.com" 
            style={{ fontSize: '1.3rem', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700, transition: 'color 0.2s' }}
          >
            hello.creativestore@gmail.com
          </a>
        </div>

        {/* Social Channels & Creator Community */}
        <div style={{ marginBottom: '36px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.01em' }}>
            Connect with Creativeedits.mov
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {/* Instagram */}
            <a 
              href="https://www.instagram.com/creativeedits.mov/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 18px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.95rem' }}>Instagram</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>@creativeedits.mov</div>
              </div>
            </a>

            {/* YouTube */}
            <a 
              href="https://www.youtube.com/@imcreativeeditsmov" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 18px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.95rem' }}>YouTube</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>@imcreativeeditsmov</div>
              </div>
            </a>

            {/* Discord */}
            <a 
              href="https://discord.gg/Pt37gnNQZK" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 18px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.95rem' }}>Discord</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Join Community</div>
              </div>
            </a>
          </div>
        </div>

        <p style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Our support team is available Monday through Friday. We typically respond within 24 hours.
        </p>
      </div>
    </LegalLayout>
  );
}
