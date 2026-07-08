import LegalLayout from '../components/LegalLayout';

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us">
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1.25rem', marginBottom: '24px' }}>
          We would love to hear from you! Whether you have a question about our assets, need technical support, or just want to say hi, feel free to drop us an email.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.5)', padding: '32px', borderRadius: '12px', display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#111827' }}>Get In Touch</h3>
          <a href="mailto:hello.creativestore@gmail.com" style={{ fontSize: '1.25rem', color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>
            hello.creativestore@gmail.com
          </a>
        </div>

        <p style={{ marginTop: '32px', color: '#4B5563' }}>
          Our support team is available Monday through Friday, 9:00 AM to 5:00 PM EST. We typically respond within 24 hours.
        </p>
      </div>
    </LegalLayout>
  );
}
