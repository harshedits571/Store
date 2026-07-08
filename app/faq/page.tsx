import LegalLayout from '../components/LegalLayout';

export default function FAQPage() {
  return (
    <LegalLayout title="Frequently Asked Questions">
      <div>
        <strong style={{ fontSize: '1.25rem', display: 'block', marginBottom: '8px' }}>How do I download my purchased items?</strong>
        After completing your purchase, you will be redirected to a success page where you can view your license keys. You will also receive an email with download instructions. You can always access your past purchases by logging into your account and visiting your Dashboard.
      </div>

      <div>
        <strong style={{ fontSize: '1.25rem', display: 'block', marginBottom: '8px' }}>Do you offer refunds?</strong>
        Due to the nature of digital products, all sales are generally final. We only offer refunds in the case of accidental double charges. Please refer to our Refund Policy for more details.
      </div>

      <div>
        <strong style={{ fontSize: '1.25rem', display: 'block', marginBottom: '8px' }}>How do I use the license keys?</strong>
        When you install one of our premium plugins or scripts, you will be prompted to enter your license key upon first launch. Copy the key from your dashboard and paste it into the activation prompt.
      </div>

      <div>
        <strong style={{ fontSize: '1.25rem', display: 'block', marginBottom: '8px' }}>I need technical support.</strong>
        We're here to help! If you're experiencing issues with any of our assets, please email us at hello.creativestore@gmail.com with your Order ID and a description of the problem.
      </div>
    </LegalLayout>
  );
}
