import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Package, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import useCartStore from '@/lib/cartStore';
import useAuthStore from '@/lib/authStore';
import { stripeApi, ordersApi } from '@/lib/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const SHIPPING_OPTIONS = [
  { id: 'standard', label: 'Standard Shipping', desc: '5–7 business days', price: 0 },
  { id: 'express', label: 'Express Shipping', desc: '2–3 business days', price: 12.99 },
  { id: 'overnight', label: 'Overnight Shipping', desc: 'Next business day', price: 29.99 },
];

// ─── Inner Checkout Form (needs Stripe context) ────────────────────────────────
function CheckoutForm({ shippingData, shippingMethod, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const { items, clearCartLocal } = useCartStore();

  const selectedShipping = SHIPPING_OPTIONS.find(o => o.id === shippingMethod) || SHIPPING_OPTIONS[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (stripeError) {
        toast.error(stripeError.message || 'Payment failed');
        setSubmitting(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Create order in backend
        const orderData = {
          shippingAddress: shippingData,
          shippingMethod: selectedShipping.label,
          shippingCost: selectedShipping.price,
          stripePaymentIntentId: paymentIntent.id,
          guestEmail: !user ? shippingData.email : undefined,
        };

        const { data } = await ordersApi.create(orderData);
        clearCartLocal();
        onSuccess(data.order.orderNumber);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Order creation failed');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="glass rounded-2xl p-6">
        <h3 className="font-semibold tracking-tight mb-4 text-[15px] flex items-center gap-2">
          <Lock size={14} className="text-neutral-400" />
          Payment details
        </h3>
        <PaymentElement
          options={{
            layout: 'tabs',
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#f5f5f7',
                colorBackground: 'rgba(14,14,18,0.9)',
                colorText: '#f5f5f7',
                colorDanger: '#f87171',
                fontFamily: 'Figtree, system-ui, sans-serif',
                borderRadius: '8px',
              },
            },
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
        data-testid="checkout-place-order-btn"
      >
        {submitting ? (
          <><Loader2 size={15} className="animate-spin" /> Processing payment…</>
        ) : (
          <><Lock size={14} /> Place order</>
        )}
      </button>

      <p className="text-[11px] text-neutral-500 text-center">
        Your payment is secured by Stripe. We never store your card details.
      </p>
    </form>
  );
}

// ─── Main Checkout Page ────────────────────────────────────────────────────────
export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, itemCount, fetchCart } = useCartStore();
  const { user } = useAuthStore();

  const [step, setStep] = useState('shipping'); // 'shipping' | 'payment'
  const [clientSecret, setClientSecret] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState('standard');

  const [shipping, setShipping] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  useEffect(() => {
    fetchCart();
  }, []);

  useEffect(() => {
    if (user) {
      setShipping(s => ({
        ...s,
        firstName: user.firstName || s.firstName,
        lastName: user.lastName || s.lastName,
        email: user.email || s.email,
        phone: user.phone || s.phone,
      }));
    }
  }, [user]);

  const shippingOption = SHIPPING_OPTIONS.find(o => o.id === selectedShipping) || SHIPPING_OPTIONS[0];
  const total = subtotal + shippingOption.price;

  const handleShippingSubmit = async (e) => {
    e.preventDefault();
    setLoadingIntent(true);
    try {
      const { data } = await stripeApi.createPaymentIntent({
        shippingCost: shippingOption.price,
        shippingMethod: shippingOption.label,
      });
      setClientSecret(data.clientSecret);
      setStep('payment');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initialize payment');
    } finally {
      setLoadingIntent(false);
    }
  };

  const handleSuccess = (orderNumber) => {
    navigate(`/order/${orderNumber}`);
  };

  if (items.length === 0 && !loadingIntent) {
    return (
      <>
        <Header />
        <main className="container-tight pt-28 pb-20 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-neutral-400 mb-4">Your cart is empty.</p>
            <Link to="/shop" className="btn-primary">Browse memory</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="container-tight pt-28 pb-20" data-testid="checkout-page">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12px] text-neutral-500 mb-8">
          <Link to="/cart" className="hover:text-white">Cart</Link>
          <ChevronRight size={12} />
          <span className={step === 'shipping' ? 'text-white' : ''}>Shipping</span>
          <ChevronRight size={12} />
          <span className={step === 'payment' ? 'text-white' : ''}>Payment</span>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: Forms */}
          <div className="space-y-4">
            {step === 'shipping' && (
              <form onSubmit={handleShippingSubmit} className="space-y-4">
                {/* Contact */}
                <section className="glass rounded-2xl p-6" data-testid="checkout-contact-section">
                  <h3 className="font-semibold tracking-tight mb-4 text-[15px]">Contact</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="First name"
                      className="input"
                      value={shipping.firstName}
                      onChange={e => setShipping(s => ({ ...s, firstName: e.target.value }))}
                      required
                    />
                    <input
                      placeholder="Last name"
                      className="input"
                      value={shipping.lastName}
                      onChange={e => setShipping(s => ({ ...s, lastName: e.target.value }))}
                      required
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email address"
                    className="input mt-3"
                    value={shipping.email}
                    onChange={e => setShipping(s => ({ ...s, email: e.target.value }))}
                    required
                  />
                  <input
                    placeholder="Phone (optional)"
                    className="input mt-3"
                    value={shipping.phone}
                    onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))}
                  />
                </section>

                {/* Shipping Address */}
                <section className="glass rounded-2xl p-6" data-testid="checkout-shipping-section">
                  <h3 className="font-semibold tracking-tight mb-4 text-[15px]">Shipping address</h3>
                  <div className="space-y-3">
                    <input
                      placeholder="Address line 1"
                      className="input"
                      value={shipping.line1}
                      onChange={e => setShipping(s => ({ ...s, line1: e.target.value }))}
                      required
                    />
                    <input
                      placeholder="Address line 2 (optional)"
                      className="input"
                      value={shipping.line2}
                      onChange={e => setShipping(s => ({ ...s, line2: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        placeholder="City"
                        className="input"
                        value={shipping.city}
                        onChange={e => setShipping(s => ({ ...s, city: e.target.value }))}
                        required
                      />
                      <input
                        placeholder="State"
                        className="input"
                        value={shipping.state}
                        onChange={e => setShipping(s => ({ ...s, state: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        placeholder="ZIP code"
                        className="input"
                        value={shipping.zip}
                        onChange={e => setShipping(s => ({ ...s, zip: e.target.value }))}
                        required
                      />
                      <input
                        placeholder="Country"
                        className="input"
                        value={shipping.country}
                        onChange={e => setShipping(s => ({ ...s, country: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </section>

                {/* Shipping Method */}
                <section className="glass rounded-2xl p-6">
                  <h3 className="font-semibold tracking-tight mb-4 text-[15px]">Shipping method</h3>
                  <div className="space-y-2">
                    {SHIPPING_OPTIONS.map(opt => (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedShipping === opt.id
                            ? 'border-white/30 bg-white/5'
                            : 'border-white/8 hover:border-white/15'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          value={opt.id}
                          checked={selectedShipping === opt.id}
                          onChange={() => setSelectedShipping(opt.id)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedShipping === opt.id ? 'border-white' : 'border-white/30'
                        }`}>
                          {selectedShipping === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-[13px] font-medium">{opt.label}</div>
                          <div className="text-[11px] text-neutral-500">{opt.desc}</div>
                        </div>
                        <div className="mono text-[13px]">
                          {opt.price === 0 ? 'Free' : `$${opt.price.toFixed(2)}`}
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                <button
                  type="submit"
                  disabled={loadingIntent}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
                >
                  {loadingIntent ? (
                    <><Loader2 size={15} className="animate-spin" /> Preparing payment…</>
                  ) : (
                    <>Continue to payment <ChevronRight size={15} /></>
                  )}
                </button>
              </form>
            )}

            {step === 'payment' && clientSecret && (
              <>
                <div className="glass rounded-2xl p-4 flex items-center gap-3 text-[13px]">
                  <div className="flex-1">
                    <span className="text-neutral-400">Shipping to: </span>
                    {shipping.firstName} {shipping.lastName}, {shipping.line1}, {shipping.city}
                  </div>
                  <button
                    onClick={() => setStep('shipping')}
                    className="text-neutral-400 hover:text-white text-[12px]"
                  >
                    Edit
                  </button>
                </div>

                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#f5f5f7',
                        colorBackground: 'rgba(14,14,18,0.9)',
                        colorText: '#f5f5f7',
                      },
                    },
                  }}
                >
                  <CheckoutForm
                    shippingData={shipping}
                    shippingMethod={selectedShipping}
                    onSuccess={handleSuccess}
                  />
                </Elements>
              </>
            )}

            {/* Stripe not configured notice */}
            {step === 'payment' && !clientSecret && !loadingIntent && (
              <div className="glass rounded-2xl p-6 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[14px]">Stripe not configured</p>
                  <p className="text-[12px] text-neutral-400 mt-1">
                    Add <code className="text-white">VITE_STRIPE_PUBLISHABLE_KEY</code> to your frontend environment variables to enable payments.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <aside className="glass rounded-2xl p-6 lg:sticky lg:top-24 h-fit" data-testid="checkout-summary">
            <div className="flex items-center gap-2 mb-5">
              <Package size={15} className="text-neutral-400" />
              <h3 className="font-semibold tracking-tight">Order summary</h3>
            </div>
            <div className="flex flex-col gap-3 mb-5 max-h-72 overflow-auto pr-1">
              {items.map((i) => (
                <div key={i.slug} className="flex gap-3 text-[12.5px]">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
                    {i.image && <img src={i.image} alt="" className="w-full h-full object-cover" />}
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center">
                      {i.qty}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] line-clamp-2">{i.name}</div>
                    <div className="mono text-[10px] text-neutral-500 mt-0.5">{i.sku}</div>
                  </div>
                  <div className="mono text-[12px] shrink-0">${(i.price * i.qty).toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 pt-4 space-y-2 text-[13px]">
              <div className="flex justify-between text-neutral-300">
                <span>Subtotal</span>
                <span className="mono">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span>Shipping</span>
                <span className="mono">{shippingOption.price === 0 ? 'Free' : `$${shippingOption.price.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Tax</span>
                <span className="mono text-[11px]">Calculated at checkout</span>
              </div>
            </div>
            <div className="border-t border-white/5 my-4" />
            <div className="flex justify-between items-baseline">
              <div className="text-[13px] text-neutral-400">Total</div>
              <div className="text-2xl font-bold tracking-tight" data-testid="checkout-total">
                ${total.toFixed(2)}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
