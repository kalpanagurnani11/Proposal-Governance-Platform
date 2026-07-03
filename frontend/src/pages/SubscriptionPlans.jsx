import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function SubscriptionPlans({ user }) {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [message, setMessage] = useState(null);

  // Checkout modal states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [checkoutError, setCheckoutError] = useState(null);

  // Cancellation modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const plansData = await api.get(`/subscription/plans?role=${user.role}`);
      setPlans(Array.isArray(plansData) ? plansData : []);

      const myData = await api.get('/subscription/my');
      setCurrentPlan(myData.hasActive ? myData.data : null);
    } catch (err) {
      console.error('Failed to load subscription data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBuyClick = (plan) => {
    const planPrice = plan.price ?? plan.Price;
    const planId = plan.id ?? plan.Id;

    if (planPrice === 0) {
      // Free plan goes straight to activation
      handleBuy(planId);
    } else {
      // Open sandbox payment details modal
      setCheckoutPlan(plan);
      setCardName('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setCheckoutError(null);
      setShowCheckoutModal(true);
    }
  };

  const handleBuy = async (planId) => {
    setBuyingId(planId);
    setMessage(null);
    try {
      const result = await api.post('/subscription/buy', {
        subscriptionId: planId,
        role: user.role,
      });
      setMessage({ type: 'success', text: result.message || 'Plan activated!' });
      await fetchData();
      setShowCheckoutModal(false);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Purchase failed.' });
    } finally {
      setBuyingId(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    setMessage(null);
    try {
      const result = await api.post('/subscription/cancel');
      setMessage({ type: 'success', text: result.message || 'Subscription plan deactivated successfully.' });
      await fetchData();
      setShowCancelModal(false);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to deactivate subscription.' });
    } finally {
      setCancelling(false);
    }
  };

  // Helper formatters
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!cardName || cardNumber.length < 15 || cardExpiry.length < 5 || cardCvv.length < 3) {
      setCheckoutError('Please enter valid payment details.');
      return;
    }
    handleBuy(checkoutPlan.id ?? checkoutPlan.Id);
  };

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
          color: white;
          font-family: 'Courier New', Courier, monospace;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-size: 0.8rem;
          color: #94a3b8;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .form-input {
          width: 100%;
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.5);
          color: white;
          outline: none;
          transition: all 0.2s;
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
            const currentSubId = currentPlan ? (currentPlan.subscriptionId ?? currentPlan.SubscriptionId) : null;
            const isActive = currentPlan && currentSubId === planId;
            const planName = plan.name ?? plan.Name;
            const planDesc = plan.description ?? plan.Description;
            const planPrice = plan.price ?? plan.Price;

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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                    <button className="btn btn-secondary" style={{ width: '100%' }} disabled>
                      Current Plan
                    </button>
                    <button
                      className="btn"
                      style={{
                        width: '100%',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--color-rejected)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onClick={() => setShowCancelModal(true)}
                    >
                      Deactivate Plan
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    disabled={buyingId === planId}
                    onClick={() => handleBuyClick(plan)}
                  >
                    {buyingId === planId ? 'Processing…' : planPrice === 0 ? 'Activate Free' : 'Buy Now'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout / Payment Details Modal */}
      {showCheckoutModal && checkoutPlan && (
        <div className="checkout-modal-backdrop">
          <div className="checkout-modal-content">
            <h3 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Checkout & Payment</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Simulated Payment Gateway — Upgrade to {checkoutPlan.name ?? checkoutPlan.Name}
            </p>

            {/* Premium Card Graphic */}
            <div className="card-preview">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>SANDBOX CARD</span>
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
                <label>Cardholder Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="John Doe"
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
                  placeholder="4111 2222 3333 4444"
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
                    placeholder="MM/YY"
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
                    maxLength="3"
                    placeholder="•••"
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
                  disabled={buyingId !== null}
                >
                  {buyingId ? 'Processing...' : `Pay ₹${checkoutPlan.price ?? checkoutPlan.Price}`}
                </button>
              </div>
            </form>
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
                  color: 'var(--text-primary)',
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
