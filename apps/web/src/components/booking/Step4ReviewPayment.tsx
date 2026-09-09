'use client';

import { useState, useRef, useEffect } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { ShieldCheck, Loader2, ArrowRight, MessageSquare, CheckCircle, CreditCard, Tag, Check, X, AlertCircle, Calendar, Users, User, Phone, Mail, HelpCircle } from 'lucide-react';
import api, { getApiErrorMessage } from '@/lib/api';
import { buildWhatsAppMessageUrl } from '@/lib/config';
import { format } from 'date-fns';
import Link from 'next/link';

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

  // Local package and add-on data for embedded mobile/desktop review
  const [pkg, setPkg] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchPackageAndActivities = async () => {
      if (!packageId) return;
      try {
        setLoadingData(true);
        const pkgRes = await api.get(`/packages/${packageId}`);
        if (!isMounted) return;
        setPkg(pkgRes.data);

        if (activityIds && activityIds.length > 0) {
          const actsRes = await Promise.all(
            activityIds.map((id) => api.get(`/activities/${id}`))
          );
          if (isMounted) setActivities(actsRes.map((r) => r.data));
        } else {
          if (isMounted) setActivities([]);
        }
      } catch (err) {
        console.error('Failed to load review details:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    fetchPackageAndActivities();
    return () => {
      isMounted = false;
    };
  }, [packageId, activityIds]);

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

  // Pre-calculated estimates for review display
  const packageTotal = pkg ? (pkg.priceAdult * headCountAdult) + (pkg.priceChild * headCountChild) : 0;
  let activitiesTotal = 0;
  activities.forEach((act) => {
    if (act.pricingType === 'PER_PERSON') {
      activitiesTotal += act.price * (headCountAdult + headCountChild);
    } else {
      activitiesTotal += act.price;
    }
  });
  const subtotalEstimate = packageTotal + activitiesTotal;
  const discountEstimate = appliedDiscount ? appliedDiscount.discountAmount : 0;
  const totalEstimate = Math.max(0, subtotalEstimate - discountEstimate);

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

    const data = bookingRes.data;
    setCreatedBooking(data);

    // Persist non-sensitive confirmation details in sessionStorage for the success receipt
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          'rm_last_booking',
          JSON.stringify({
            bookingNumber: data.bookingNumber,
            bookingId: data.id,
            packageName: data.package?.name || pkg?.name || 'Day Tourism Package',
            dateStr: date ? format(new Date(date), 'dd MMMM yyyy') : '',
            headCountAdult,
            headCountChild,
            guestName: customerDetails?.name || 'Guest',
            guestPhone: customerDetails?.phone || '',
            guestEmail: customerDetails?.email || '',
            totalAmount: data.totalAmount ?? totalEstimate,
            subtotalAmount: data.subtotalAmount ?? subtotalEstimate,
            discountAmount: data.discountAmount ?? discountEstimate,
            discountCode: data.discountCode || appliedDiscount?.code || '',
            advanceRequired: data.advanceRequired ?? 0,
          })
        );
      } catch (storageErr) {
        console.warn('Could not cache booking summary in sessionStorage', storageErr);
      }
    }

    return data;
  };

  const isSubmittingRef = useRef(false);

  const handleWhatsAppBooking = async () => {
    if (isSubmittingRef.current) return;
    try {
      isSubmittingRef.current = true;
      setLoading(true);
      setError('');

      const booking = await getOrCreateBooking();

      const packageName = booking.package?.name || pkg?.name || 'Day Tourism Package';
      const dateStr = date ? format(new Date(date), 'dd MMMM yyyy') : '';

      const waUrl = buildWhatsAppMessageUrl({
        bookingNumber: booking.bookingNumber,
        packageName,
        dateStr,
        headCountAdult,
        headCountChild,
        guestName: customerDetails?.name || 'Guest',
        guestPhone: customerDetails?.phone || '',
        totalAmount: booking.totalAmount || totalEstimate,
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
            window.location.href = `/booking/success?bookingId=${booking.id}&bookingNumber=${booking.bookingNumber}`;
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

  // ================= SUBMISSION SUCCESS VIEW =================
  if (isSubmitted && createdBooking) {
    const waUrl = buildWhatsAppMessageUrl({
      bookingNumber: createdBooking.bookingNumber,
      packageName: createdBooking.package?.name || pkg?.name || 'Day Tourism Package',
      dateStr: date ? format(new Date(date), 'dd MMMM yyyy') : '',
      headCountAdult,
      headCountChild,
      guestName: customerDetails?.name || 'Guest',
      guestPhone: customerDetails?.phone || '',
      totalAmount: createdBooking.totalAmount || totalEstimate,
    });

    return (
      <div className="space-y-6 text-center py-6 animate-in fade-in duration-500 max-w-xl mx-auto">
        <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2 shadow-sm">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">Your Booking Request is Sent!</h2>
          <p className="text-xs text-gray-500">
            Request registered on our system. We will confirm date availability prior to payment.
          </p>
        </div>

        {/* Authoritative Details Box */}
        <div className="bg-[#FAF9F6] border border-[#D4AF37]/40 rounded-2xl p-6 text-left space-y-3 text-sm shadow-sm">
          <div className="flex justify-between border-b border-gray-200 pb-2.5">
            <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Booking Reference</span>
            <span className="font-mono font-bold text-[#1E3F20] text-base">{createdBooking.bookingNumber}</span>
          </div>

          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">Package</span>
            <span className="font-semibold text-gray-800 text-right">{createdBooking.package?.name || pkg?.name}</span>
          </div>

          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">Visit Date</span>
            <span className="font-semibold text-gray-800">{date ? format(new Date(date), 'dd MMMM yyyy') : ''}</span>
          </div>

          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">Guests</span>
            <span className="font-semibold text-gray-800">{headCountAdult} Adults{headCountChild > 0 ? `, ${headCountChild} Children` : ''}</span>
          </div>

          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">Guest Name</span>
            <span className="font-semibold text-gray-800">{customerDetails?.name}</span>
          </div>

          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">WhatsApp Phone</span>
            <span className="font-semibold text-gray-800">{customerDetails?.phone}</span>
          </div>

          {createdBooking.discountAmount > 0 && (
            <>
              <div className="flex justify-between border-b border-gray-100 pb-2 text-xs">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-800">₹{createdBooking.subtotalAmount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2 text-xs text-emerald-700">
                <span>Offer Savings ({createdBooking.discountCode})</span>
                <span className="font-semibold">-₹{createdBooking.discountAmount?.toLocaleString('en-IN')}</span>
              </div>
            </>
          )}

          <div className="flex justify-between pt-1 items-baseline">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-500 block">Total Amount</span>
              <span className="text-[10px] text-gray-400">Taxes included</span>
            </div>
            <span className="font-bold text-[#1E3F20] text-xl">₹{createdBooking.totalAmount?.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* 4-Step Next Steps Roadmap */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 text-left space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1E3F20] flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#D4AF37]" /> What Happens Next?
          </p>
          <ol className="space-y-2 text-xs text-gray-600 list-decimal pl-4 leading-relaxed">
            <li><strong className="text-gray-900">Availability Check:</strong> Our resort manager verifies dates and capacity.</li>
            <li><strong className="text-gray-900">Concierge WhatsApp:</strong> We will reach out to you on WhatsApp to confirm your schedule.</li>
            <li><strong className="text-gray-900">Payment Instructions:</strong> Official UPI & bank transfer details will be provided upon approval.</li>
            <li><strong className="text-gray-900">Final Confirmation:</strong> Your booking is confirmed as soon as payment is verified.</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3.5 bg-[#25D366] text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#1EBE5B] transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <MessageSquare className="w-4 h-4" /> Re-open WhatsApp Message
          </a>
          <Link
            href={`/booking/success?bookingNumber=${createdBooking.bookingNumber}&bookingId=${createdBooking.id}`}
            className="py-3.5 px-4 bg-[#1E3F20] text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#2A522C] transition-colors flex items-center justify-center gap-1.5"
          >
            View Receipt
          </Link>
        </div>

        <button
          onClick={() => {
            reset();
            window.location.href = '/';
          }}
          className="text-xs text-gray-500 hover:text-gray-800 underline block mx-auto pt-2"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // ================= MAIN STEP 4 VIEW =================
  return (
    <div className="space-y-8 text-center py-4">
      <div className="w-16 h-16 mx-auto bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-2">
        <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
      </div>

      <div className="space-y-2 text-center max-w-xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">4. Review & Booking Request</h2>
        <p className="text-sm text-gray-600 font-light leading-relaxed">
          Please review your booking details below. When ready, click <strong>Continue on WhatsApp</strong> to send your prefilled reservation request to our concierge.
        </p>
      </div>

      {/* Embedded Reservation Summary Card (Essential for Mobile users who don't see desktop sidebar) */}
      <div className="max-w-xl mx-auto bg-white border border-[#D4AF37]/40 rounded-2xl p-5 shadow-sm text-left space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1E3F20]">Reservation Summary</span>
          <span className="text-[11px] bg-[#1E3F20]/10 text-[#1E3F20] px-2 py-0.5 rounded-full font-medium">
            {type.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
          <div className="flex items-start gap-2 bg-[#FAF9F6] p-2.5 rounded-xl">
            <Calendar className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Visit Date</p>
              <p className="font-bold text-[#1E3F20]">{date ? format(new Date(date), 'EEE, dd MMM yyyy') : 'Not selected'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-[#FAF9F6] p-2.5 rounded-xl">
            <Users className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Guests</p>
              <p className="font-bold text-[#1E3F20]">{headCountAdult} Adults{headCountChild > 0 ? `, ${headCountChild} Children` : ''}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-[#FAF9F6] p-2.5 rounded-xl">
            <User className="w-4 h-4 text-[#D4AF37] mt-0.5 flex-shrink-0" />
            <div className="truncate">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Contact Name</p>
              <p className="font-bold text-gray-900 truncate">{customerDetails?.name || 'Guest'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-[#FAF9F6] p-2.5 rounded-xl">
            <Phone className="w-4 h-4 text-[#25D366] mt-0.5 flex-shrink-0" />
            <div className="truncate">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">WhatsApp Number</p>
              <p className="font-bold text-gray-900 truncate">{customerDetails?.phone || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Selected Package Line */}
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-gray-800">{pkg?.name || 'Selected Package'}</span>
            <span className="font-bold text-[#1E3F20]">₹{packageTotal.toLocaleString('en-IN')}</span>
          </div>

          {/* Add-ons if any */}
          {activities.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] uppercase font-bold text-gray-400">Add-ons</p>
              {activities.map((act) => {
                const isPerPerson = act.pricingType === 'PER_PERSON';
                const cost = isPerPerson ? act.price * (headCountAdult + headCountChild) : act.price;
                return (
                  <div key={act.id} className="flex justify-between text-xs text-gray-600">
                    <span className="truncate pr-2">{act.name}</span>
                    <span className="font-medium whitespace-nowrap">₹{cost.toLocaleString('en-IN')}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subtotal & Discount Breakdown */}
          {appliedDiscount && (
            <div className="pt-2 border-t border-dashed border-gray-200 space-y-1 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>₹{subtotalEstimate.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Offer Savings ({appliedDiscount.code})</span>
                <span>-₹{discountEstimate.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
            <div>
              <span className="text-xs uppercase font-bold text-gray-500 block">Total Payable</span>
              <span className="text-[10px] text-gray-400">Inclusive of all applicable resort taxes</span>
            </div>
            <span className="text-xl font-serif font-bold text-[#1E3F20]">
              ₹{totalEstimate.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Promo Code Section */}
      <div className="max-w-xl mx-auto bg-white border border-[#D4AF37]/30 p-4 rounded-2xl shadow-sm text-left space-y-3">
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

      {/* Transparent Booking Process Notice */}
      <div className="max-w-xl mx-auto bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 text-left text-xs text-amber-900 space-y-1.5">
        <p className="font-bold flex items-center gap-1.5 text-amber-950">
          <ShieldCheck className="w-4 h-4 text-amber-700" /> Transparent Booking Commitment
        </p>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Opening WhatsApp connects you directly with our resort concierge. <strong>No payment is taken at this moment.</strong> Our team confirms date availability with our property team first, then shares verified payment options (UPI / NetBanking).
        </p>
      </div>

      {/* Submission Actions */}
      <div className="max-w-xl mx-auto space-y-4 pt-2">
        {loading ? (
          <div className="space-y-4 py-8">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
            <p className="text-[#1E3F20] font-medium text-sm">Registering your booking request...</p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-start gap-2 text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Submission Error</p>
                <p className="text-xs">{error}</p>
                <p className="text-[11px] text-gray-500 mt-1">Your entered details have been preserved. You can safely try again.</p>
              </div>
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


