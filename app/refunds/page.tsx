import LegalLayout from '../components/LegalLayout';

export default function RefundsPage() {
  return (
    <LegalLayout title="Refund policy">
      <div>
        *Due to the nature of digital products we cannot offer refunds but only for the below reason. We will work with you to make sure that everything you purchase is working properly!*
      </div>

      <div>
        <strong style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}>Double Payment or Overcharge:</strong>
        If you believe that you have been charged twice for a single transaction or have experienced any overcharge issue related to the purchase of our packs, please contact us immediately at hello.creativestore@gmail.com
      </div>

      <div>
        <strong style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}>Refund Timeframe:</strong>
        We understand the urgency of resolving payment issues. Our commitment is to refund your money within 24 hours (1 business day) of confirming the double payment or overcharge. Please note that the actual time it takes for the refund to reflect in your account may vary depending on your payment provider.
      </div>

      <div>
        <strong style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}>How to Contact Us:</strong>
        To report a double payment or overcharge issue and request a refund for your editing packs, please contact our support through one of the following methods:<br/>
        Email: hello.creativestore@gmail.com
      </div>

      <div>
        <strong style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}>Our Commitment:</strong>
        We are committed to providing excellent customer service and resolving any payment-related concerns related to your editing pack purchases promptly and efficiently.<br/><br/>
        Your satisfaction is our priority.
      </div>
    </LegalLayout>
  );
}
