'use client';

import { useState, useRef } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { ShieldCheck, Loader2, ArrowRight, MessageSquare, CheckCircle, CreditCard, Tag, Check, X, AlertCircle } from 'lucide-react';
import api, { getApiErrorMessage } from '@/lib/api';
import { buildWhatsAppMessageUrl } from '@/lib/config';
import { format } from 'date-fns';

export function Step4ReviewPayment({ onBack }: { onBack: () => void }) {
  const {
    date,
    type,
    headCountAdult,
    headCountChild,
    packageId,
    activityIds,
    customerDetails,
    discountCode,
    appliedDiscount,
    setDiscountCode,
    setAppliedDiscount,
    clearDiscount,
    reset,
  } = useBookingStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);

  // Promo code local input state
  const [promoInput, setPromoInput] = useState(discountCode || '');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  // Helper to validate offer code
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    if (!packageId || !date) {
      setPromoError('Please select a package and date first.');
      return;
    }

    try {
      setValidatingPromo(true);
      setPromoError('');
      setPromoSuccess('');

      const res = await api.post('/discounts/validate', {
        code: promoInput.trim(),
        packageId,
        activityIds,
        headCountAdult,
        headCountChild,
        date: date.toISOString(),
      });

      if (res.data.valid) {
        setDiscountCode(promoInput.trim().toUpperCase());
        setAppliedDiscount(res.data);
        setPromoSuccess(`Offer '${res.data.offerName}' applied! You save ₹${res.data.discountAmount}.`);
      } else {
        setPromoError(res.data.message || 'Invalid or expired offer code.');
      }
    } catch (err: any) {
      setPromoError(err.response?.data?.message || 'Failed to validate offer code.');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    clearDiscount();
    setPromoInput('');
    setPromoError('');
    setPromoSuccess('');
  };

  // Unique idempotency key per booking wizard attempt/mount
  const idempotencyKeyRef = useRef<string>('');
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `book_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Helper to ensure booking is created only ONCE per session
  const getOrCreateBooking = async () => {
    if (createdBooking) return createdBooking;

    if (!packageId || !date || !customerDetails) {
      throw new Error('Missing required booking details. Please go back and check your information.');
    }

    const payload: any = {
      date: date.toISOString(),
      type,
      packageId,
      headCountAdult,
      headCountChild,
      activityIds,
      guestName: customerDetails.name,
      guestEmail: customerDetails.email,
      guestPhone: customerDetails.phone,
      idempotencyKey: idempotencyKeyRef.current,
    };

    if (appliedDiscount?.code || discountCode) {
      payload.discountCode = appliedDiscount?.code || discountCode;
    }

    const bookingRes = await api.post('/bookings', payload, {
      headers: {
        'Idempotency-Key': idempotencyKeyRef.current,
      },
    });

    setCreatedBooking(bookingRes.data);
    return bookingRes.data;
  };

  const isSubmittingRef = useRef(false);

  const handleWhatsAppBooking = async () => {
    if (isSubmittingRef.current) return;
    try {
      isSubmittingRef.current = true;
      setLoading(true);
      setError('');

      const booking = await getOrCreateBooking();

      const packageName = booking.package?.name || 'Day Tourism Package';
      const dateStr = date ? format(new Date(date), 'dd MMMM yyyy') : '';

      const waUrl = buildWhatsAppMessageUrl({
        bookingNumber: booking.bookingNumber,
        packageName,
        dateStr,
        headCountAdult,
        headCountChild,
        guestName: customerDetails?.name || 'Guest',
        guestPhone: customerDetails?.phone || '',
        totalAmount: booking.totalAmount || 0,
      });

      // Open WhatsApp in new window
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setIsSubmitted(true);
    } catch (err: any) {
      console.error('WhatsApp booking error:', err);
      setError(getApiErrorMessage(err, 'Failed to process booking request. Please try again.'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleRazorpayCheckout = async () => {
    if (isSubmittingRef.current) return;
    try {
      isSubmittingRef.current = true;
      setLoading(true);
      setError('');

      const booking = await getOrCreateBooking();

      const orderRes = await api.post('/payments/create-order', {
        bookingId: booking.id,
      });

      const { orderId, amount, currency, key } = orderRes.data;

      if (!(window as any).Razorpay) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }

      setLoading(false);
      isSubmittingRef.current = false;

      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: 'River Mist Resort',
        description: 'Booking Payment',
        order_id: orderId,
        handler: async function (response: any) {
          try {
            setLoading(true);
            await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            reset();
            window.location.href = `/booking/success?bookingId=${booking.id}`;
          } catch (err) {
            setError(getApiErrorMessage(err, 'Payment verification failed. Please contact support.'));
            setLoading(false);
          }
        },
        prefill: {
          name: customerDetails?.name,
          email: customerDetails?.email,
          contact: customerDetails?.phone,
        },
        theme: {
          color: '#1E3F20',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError('Payment failed: ' + (response.error?.description || 'Transaction declined'));
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to initialize checkout. Please try again.'));
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (isSubmitted && createdBooking) {
    const waUrl = buildWhatsAppMessageUrl({
      bookingNumber: createdBooking.bookingNumber,
      packageName: createdBooking.package?.name || 'Day Tourism Package',
      dateStr: date ? format(new Date(date), 'dd MMMM yyyy') : '',
      headCountAdult,
      headCountChild,
      guestName: customerDetails?.name || 'Guest',
      guestPhone: customerDetails?.phone || '',
      totalAmount: createdBooking.totalAmount || 0,
    });

    return (
      <div className="space-y-6 text-center py-6 animate-in fade-in duration-500">
        <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
          <CheckCircle className="w-10 h-10" />
        </div>

        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">Your Booking Request is Sent!</h2>

        <div className="bg-[#1E3F20]/5 border border-[#D4AF37]/30 rounded-2xl p-6 text-left max-w-md mx-auto space-y-3 text-sm">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Booking Reference</span>
            <span className="font-mono font-bold text-[#1E3F20]">{createdBooking.bookingNumber}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Package</span>
            <span className="font-semibold text-gray-800">{createdBooking.package?.name}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Date</span>
            <span className="font-semibold text-gray-800">{date ? format(new Date(date), 'dd MMM yyyy') : ''}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-500">Guests</span>
            <span className="font-semibold text-gray-800">{headCountAdult} Adults, {headCountChild} Children</span>
          </div>

          {createdBooking.discountAmount > 0 && (
            <>
              <div className="flex justify-between border-b pb-2 text-xs">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-800">₹{createdBooking.subtotalAmount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-b pb-2 text-xs text-emerald-700">
                <span>Discount ({createdBooking.discountCode})</span>
                <span className="font-semibold">-₹{createdBooking.discountAmount?.toLocaleString('en-IN')}</span>
              </div>
            </>
          )}

          <div className="flex justify-between pt-1">
            <span className="text-gray-500">Estimated Total</span>
            <span className="font-bold text-[#1E3F20] text-base">₹{createdBooking.totalAmount?.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          Our team will confirm date availability and contact you on WhatsApp with manual payment instructions.
        </p>

        <div className="pt-4 flex flex-col gap-3 max-w-xs mx-auto">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#1EBE5B] transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <MessageSquare className="w-4 h-4" /> Re-open WhatsApp Message
          </a>
          <button
            onClick={() => {
              reset();
              window.location.href = '/';
            }}
            className="w-full py-3 border border-gray-300 rounded-xl text-gray-700 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-center py-4">
      <div className="w-16 h-16 mx-auto bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-4">
        <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
      </div>

      <div className="space-y-2 text-center">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">4. Review & Booking Request</h2>
        <p className="text-sm text-gray-500 font-light max-w-md mx-auto">
          Review your reservation details on the right and continue on WhatsApp for concierge confirmation & payment details.
        </p>
      </div>

      {/* Promo Code Section */}
      <div className="max-w-md mx-auto bg-white border border-[#D4AF37]/30 p-4 rounded-2xl shadow-sm text-left space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#1E3F20]">
          <Tag className="w-4 h-4 text-[#D4AF37]" />
          <span>Have a Promo / Coupon Code?</span>
        </div>

        {appliedDiscount ? (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
            <div>
              <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> {appliedDiscount.offerName} ({appliedDiscount.code})
              </p>
              <p className="text-[11px] text-emerald-600">
                You save ₹{appliedDiscount.discountAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemovePromo}
              className="p-1 text-emerald-700 hover:text-red-600 transition-colors"
              title="Remove promo code"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Code (e.g. MONSOON20)"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-xl uppercase font-mono tracking-wider focus:outline-none focus:border-[#1E3F20]"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={validatingPromo || !promoInput.trim()}
                className="px-4 py-2 bg-[#1E3F20] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#2A522C] transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {validatingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
              </button>
            </div>
            {promoError && <p className="text-[11px] text-red-600 font-medium">{promoError}</p>}
            {promoSuccess && <p className="text-[11px] text-emerald-600 font-medium">{promoSuccess}</p>}
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto space-y-4 pt-2">
        {loading ? (
          <div className="space-y-4 py-8">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
            <p className="text-[#1E3F20] font-medium text-sm">Preparing your booking request...</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
            <button
              onClick={handleWhatsAppBooking}
              className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold tracking-widest uppercase text-xs hover:bg-[#1EBE5B] transition-colors duration-300 shadow-md flex justify-center items-center gap-2"
            >
              Try WhatsApp Again <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={onBack}
              className="w-full py-3.5 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Primary Action: WhatsApp Concierge */}
            <button
              onClick={handleWhatsAppBooking}
              className="w-full py-4 bg-[#1E3F20] text-white rounded-xl font-bold tracking-widest uppercase text-xs hover:bg-[#2A522C] transition-all duration-300 shadow-xl flex justify-center items-center gap-2.5 group"
            >
              <MessageSquare className="w-4 h-4 text-[#25D366] group-hover:scale-110 transition-transform" />
              Continue on WhatsApp
              <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
            </button>

            {/* Toggle Razorpay alternative */}
            {!showRazorpay ? (
              <button
                type="button"
                onClick={() => setShowRazorpay(true)}
                className="text-xs text-gray-500 hover:text-[#1E3F20] underline font-medium pt-1 block mx-auto"
              >
                Or pay online instantly via Card / UPI (Razorpay)
              </button>
            ) : (
              <div className="pt-2 border-t border-gray-100 space-y-2 animate-in fade-in duration-300">
                <button
                  onClick={handleRazorpayCheckout}
                  className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold tracking-widest uppercase text-xs hover:bg-black transition-colors flex justify-center items-center gap-2"
                >
                  <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                  Pay Online via Razorpay
                </button>
              </div>
            )}

            <button
              onClick={onBack}
              className="w-full py-3.5 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>

            <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" /> Concierge support & verified manual booking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

