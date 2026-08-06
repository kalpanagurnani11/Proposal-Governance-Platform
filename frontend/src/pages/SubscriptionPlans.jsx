import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { validateCardDetails } from '../utils/validators';

export default function SubscriptionPlans({ user, onSubscriptionChange }) {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [message, setMessage] = useState(null);

  // Checkout modal states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('card'); // 'card' | 'otp'
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sentOtpInfo, setSentOtpInfo] = useState(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  // Cancellation modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const getDefaultPlans = (role) => {
    if (role === 'Founder') {
      return [
        {
          id: 1,
          name: 'Starter Founder',
          description: 'Basic proposal submission, community peer reviews, and standard platform access.',
          price: 0,
        },
        {
          id: 2,
          name: 'Premium Founder',
          description: 'Unlimited proposal submissions, priority Gemini AI analysis, verified founder badge, and direct investor messaging.',
          price: 20,
        }
      ];
    }
    return [
      {
        id: 3,
        name: 'Starter Investor',
        description: 'Browse marketplace proposals, view basic startup metrics, and express investment interest.',
        price: 0,
      },
      {
        id: 4,
        name: 'Premium Investor',
        description: 'Full pitch deck downloads, priority due diligence reports, direct founder consultation, and real-time deal alerts.',
        price: 20,
      }
    ];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const plansData = await api.get(`/subscription/plans?role=${user.role}`);
      const defaultRolePlans = getDefaultPlans(user.role);
      if (Array.isArray(plansData) && plansData.length > 0) {
        setPlans(plansData);
      } else {
        setPlans(defaultRolePlans);
      }

      const myData = await api.get('/subscription/my');
      setCurrentPlan(myData.hasActive ? myData.data : null);
    } catch (err) {
      console.error('Failed to load subscription data', err);
      setPlans(getDefaultPlans(user.role));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value) => {
    let v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleBuyClick = async (plan) => {
    const planPrice = plan.price ?? plan.Price;
    const planId = plan.id ?? plan.Id;

    if (planPrice === 0) {
      handleBuyFree(planId);
      return;
    }

    setBuyingId(planId);
    setMessage(null);

    try {
      // 1. Create Razorpay order via backend
      const orderRes = await api.post('/subscription/buy', {
        subscriptionId: planId,
        role: user.role,
      });

      if (!orderRes.success) {
        setMessage({ type: 'error', text: orderRes.message || 'Failed to create payment order.' });
        setBuyingId(null);
        return;
      }

      if (orderRes.isFree) {
        setMessage({ type: 'success', text: 'Free plan activated!' });
        await fetchData();
        if (onSubscriptionChange) await onSubscriptionChange();
        setBuyingId(null);
        return;
      }

      // 2. Open Razorpay SDK if live key configured (not test/placeholder), otherwise use built-in Payment Gateway Modal
      const isRealKey = orderRes.keyId && !orderRes.keyId.toLowerCase().includes('placeholder') && !orderRes.keyId.toLowerCase().includes('test');

      if (window.Razorpay && isRealKey) {
        const options = {
          key: orderRes.keyId,
          amount: orderRes.amountInPaise || 2000,
          currency: orderRes.currency || 'INR',
          name: 'InnovAura Platform',
          description: `Upgrade to ${orderRes.planName || 'Premium Plan'} (₹20/mo)`,
          order_id: orderRes.orderId,
          handler: async function (response) {
            setBuyingId(planId);
            try {
              const verifyRes = await api.post('/payment/verify', {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                paymentType: orderRes.paymentType,
                subscriptionId: planId,
                role: user.role,
              });

              if (verifyRes.success) {
                setMessage({ type: 'success', text: verifyRes.message || 'Payment verified & Premium Subscription activated!' });
                await fetchData();
                if (onSubscriptionChange) await onSubscriptionChange();
              } else {
                setMessage({ type: 'error', text: verifyRes.message || 'Payment signature verification failed.' });
              }
            } catch (vErr) {
              setMessage({ type: 'error', text: vErr.message || 'Payment verification failed.' });
            } finally {
              setBuyingId(null);
            }
          },
          prefill: {
            name: user?.fullName || '',
            email: user?.email || '',
          },
          theme: {
            color: '#06b6d4',
          },
          modal: {
            ondismiss: function () {
              setBuyingId(null);
            }
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          console.warn('Razorpay SDK payment failed/unsupported in test mode. Fallback to built-in gateway modal.', response);
          setCheckoutPlan({ ...plan, orderId: orderRes.orderId });
          setCheckoutStep('card');
          setCardName(user?.fullName || '');
          setCardNumber('');
          setCardExpiry('');
          setCardCvv('');
          setOtpCode('');
          setSentOtpInfo(null);
          setCheckoutError(null);
          setShowCheckoutModal(true);
          setBuyingId(null);
        });
        rzp.open();
      } else {
        // Built-in interactive Payment Gateway modal
        setCheckoutPlan({ ...plan, orderId: orderRes.orderId });
        setCheckoutStep('card');
        setCardName(user?.fullName || '');
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        setOtpCode('');
        setSentOtpInfo(null);
        setCheckoutError(null);
        setShowCheckoutModal(true);
        setBuyingId(null);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Purchase failed.' });
      setBuyingId(null);
    }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    setCheckoutError(null);
    try {
      const res = await api.post('/payment/send-otp');
      setSentOtpInfo(res);
      setCheckoutStep('otp');
    } catch (err) {
      setCheckoutError(err.message || 'Failed to send OTP to registered email.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    setCheckoutError(null);

    const cardVal = validateCardDetails(cardName, cardNumber, cardExpiry, cardCvv);
    if (!cardVal.isValid) {
      setCheckoutError(cardVal.message);
      return;
    }

    handleSendOtp();
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!checkoutPlan) return;
    if (!otpCode || otpCode.trim().length !== 6) {
      setCheckoutError('Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    const planId = checkoutPlan.id ?? checkoutPlan.Id;
    setBuyingId(planId);
    setCheckoutError(null);

    try {
      const verifyRes = await api.post('/payment/verify', {
        orderId: checkoutPlan.orderId || 'order_sim_' + Date.now(),
        paymentId: 'pay_sim_' + Date.now(),
        signature: 'sig_sim_verified',
        paymentType: 'Subscription',
        subscriptionId: planId,
        role: user.role,
        otp: otpCode.trim(),
      });

      if (verifyRes.success) {
        setShowCheckoutModal(false);
        setMessage({ type: 'success', text: verifyRes.message || '💥 BOOM! Security OTP verified & Premium Subscription activated!' });
        await fetchData();
        if (onSubscriptionChange) await onSubscriptionChange();
      } else {
        setCheckoutError(verifyRes.message || 'Payment verification failed.');
      }
    } catch (err) {
      setCheckoutError(err.message || 'Payment verification failed.');
    } finally {
      setBuyingId(null);
    }
  };

  // Guard for Founder & Investor roles only
  if (user?.role !== 'Founder' && user?.role !== 'Investor') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Subscription module is available exclusively for Founder and Investor accounts.
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto', position: 'relative' }}>
      {/* Dynamic Style Injection for Premium Layout */}
      <style>{`
        .checkout-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .checkout-modal-content {
          background: rgba(30, 41, 59, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          width: 90%;
          max-width: 460px;
          padding: 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          color: #f8fafc;
          position: relative;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .card-preview {
          background: linear-gradient(135deg, #4f46e5, #06b6d4);
          border-radius: 12px;
          padding: 1.5rem;
          height: 180px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
          margin-bottom: 1.5rem;
          color: #000000;
          font-family: 'Courier New', Courier, monospace;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.8rem;
          color: #e2e8f0;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }
        .form-input {
          width: 100%;
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: #ffffff;
          color: #0f172a;
          outline: none;
          transition: all 0.2s;
        }
        .form-input::placeholder {
          color: #94a3b8;
          opacity: 1;
        }
        .form-input:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.25);
        }
        .checkout-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Subscription Plans</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        {currentPlan
          ? `Current plan: ${currentPlan.subscription?.name || currentPlan.Subscription?.Name || 'Active'}`
          : 'You are on the free tier.'}
      </p>

      {message && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 8,
            marginBottom: '1rem',
            background: message.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: message.type === 'success' ? 'var(--accent-secondary)' : 'var(--color-rejected)',
            border: `1px solid ${message.type === 'success' ? 'var(--accent-secondary)' : 'var(--color-rejected)'}`,
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading plans…</p>
      ) : plans.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No plans available for your role.</p>
      ) : (
        <div className="metrics-grid">
          {plans.map((plan) => {
            const planId = plan.id ?? plan.Id;
            const planName = plan.name ?? plan.Name;
            const planDesc = plan.description ?? plan.Description;
            const planPrice = plan.price ?? plan.Price;
            const currentSubId = currentPlan ? (currentPlan.subscriptionId ?? currentPlan.SubscriptionId) : null;
            const isActive = currentPlan ? (currentSubId === planId) : (planPrice === 0);

            return (
              <div
                key={planId}
                className="metric-card"
                style={{ border: isActive ? '2px solid var(--accent-cyan)' : undefined }}
              >
                <div className="metric-header">
                  <h3 style={{ color: 'var(--text-primary)' }}>{planName}</h3>
                  {isActive && (
                    <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
                      ✓ Active
                    </span>
                  )}
                </div>
                <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>
                  {planPrice === 0 ? 'Free' : `₹${planPrice}/mo`}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0 1rem' }}>
                  {planDesc}
                </p>
                {isActive ? (
                  <button className="btn btn-secondary" style={{ width: '100%' }} disabled>
                    Current Plan
                  </button>
                ) : planPrice > 0 ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={buyingId === planId}
                    onClick={() => handleBuyClick(plan)}
                  >
                    {buyingId === planId ? 'Processing…' : 'Upgrade to Premium'}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout / Payment Details Modal */}
      {showCheckoutModal && checkoutPlan && (
        <div className="checkout-modal-backdrop">
          <div className="checkout-modal-content">
            <h3 style={{ marginTop: 0, marginBottom: '0.25rem' }}>
              {checkoutStep === 'otp' ? '🔒 Razorpay Email Security OTP' : 'Checkout & Payment'}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {checkoutStep === 'otp'
                ? `Enter the 6-digit security code sent to ${sentOtpInfo?.emailMasked || user?.email || 'your email'}`
                : `Simulated Payment Gateway — Upgrade to ${checkoutPlan.name ?? checkoutPlan.Name}`}
            </p>

            {checkoutStep === 'card' ? (
              <>
                {/* Premium Card Graphic */}
                <div className="card-preview">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>MOCK CARD</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>VISA</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', letterSpacing: '0.15em', margin: '1rem 0 0.5rem' }}>
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.5rem', opacity: 0.7 }}>CARDHOLDER</div>
                      <div>{(cardName || 'Cardholder Name').toUpperCase()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.5rem', opacity: 0.7 }}>EXPIRES</div>
                      <div>{cardExpiry || 'MM/YY'}</div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCheckoutSubmit}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>Cardholder Name</label>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{cardName.length}/30 chars</span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      className="form-input"
                      placeholder="e.g. Johnathan Smith (10-30 chars)"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Card Number</label>
                    <input
                      type="text"
                      required
                      maxLength="19"
                      className="form-input"
                      placeholder="e.g. 4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    />
                  </div>

                  <div className="checkout-grid">
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input
                        type="text"
                        required
                        maxLength="5"
                        placeholder="MM/YY (e.g. 12/28)"
                        className="form-input"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label>CVV</label>
                      <input
                        type="password"
                        required
                        maxLength="4"
                        placeholder="e.g. 123"
                        className="form-input"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      />
                    </div>
                  </div>

                  {checkoutError && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      {checkoutError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => setShowCheckoutModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 2 }}
                      disabled={sendingOtp}
                    >
                      {sendingOtp ? 'Sending Email OTP...' : 'Send OTP & Proceed'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* OTP Step */
              <form onSubmit={handleOtpSubmit}>
                {sentOtpInfo?.otp && (
                  <div
                    style={{
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      borderRadius: '8px',
                      padding: '0.9rem',
                      marginBottom: '1.25rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                      📩 Security OTP sent to {sentOtpInfo.emailMasked || user?.email}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '0.25em', color: '#06b6d4' }}>
                      {sentOtpInfo.otp}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Enter this 6-digit code below to verify your payment.
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Enter 6-Digit Email OTP
                  </label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    autoFocus
                    className="form-input"
                    placeholder="Enter 6-digit OTP (e.g. 839215)"
                    style={{
                      fontSize: '1.5rem',
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      padding: '0.75rem',
                    }}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>

                {checkoutError && (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                    {checkoutError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setCheckoutStep('card')}
                  >
                    ← Edit Card Details
                  </button>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#06b6d4', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? 'Resending...' : 'Resend OTP to Email'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowCheckoutModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 2, background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', fontWeight: 'bold' }}
                    disabled={buyingId !== null || otpCode.length !== 6}
                  >
                    {buyingId ? 'Verifying OTP...' : `Verify OTP & Pay ₹${checkoutPlan.price ?? checkoutPlan.Price}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Cancellation/Deactivation Modal */}
      {showCancelModal && (
        <div className="checkout-modal-backdrop">
          <div className="checkout-modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, color: '#ef4444' }}>Deactivate Subscription?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.4', marginBottom: '1.5rem' }}>
              Are you sure you want to deactivate your current active subscription? You will lose access to all premium features and revert to the default free tier.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                No, Keep It
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  background: '#ef4444',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onClick={handleCancelSubscription}
                disabled={cancelling}
              >
                {cancelling ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
