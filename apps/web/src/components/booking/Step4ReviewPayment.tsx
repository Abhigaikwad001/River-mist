'use client';
import { useState, useRef } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

export function Step4ReviewPayment({ onBack }: { onBack: () => void }) {
  const { date, type, headCountAdult, headCountChild, packageId, activityIds, customerDetails, reset } = useBookingStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'creating_booking' | 'initializing_payment' | 'awaiting_payment'>('idle');
  const router = useRouter();

  const handleCheckout = async () => {
    if (!packageId || !date || !customerDetails) {
      setError('Missing required booking details. Please go back and check your information.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Step 1: Create Booking in DB
      setStatus('creating_booking');
      
      const bookingRes = await api.post('/bookings', {
        date: date?.toISOString(),
        type,
        packageId,
        headCountAdult,
        headCountChild,
        activityIds,
        guestName: customerDetails.name,
        guestEmail: customerDetails.email,
        guestPhone: customerDetails.phone
      });

      // Step 2: Create Razorpay Order
      setStatus('initializing_payment');
      const orderRes = await api.post('/payments/create-order', {
        bookingId: bookingRes.data.id
      });
      
      const { orderId, amount, currency, key } = orderRes.data;

      // Load Razorpay script if not loaded
      if (!(window as any).Razorpay) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          document.body.appendChild(script);
        });
      }

      // Step 3: Open Checkout
      setStatus('awaiting_payment');
      setLoading(false); // Stop loading UI because Razorpay modal opens
      
      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: "River Mist Resort",
        description: "Booking Payment",
        order_id: orderId,
        handler: async function (response: any) {
          try {
            setLoading(true); // Resume loading while verifying
            await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            reset();
            router.push(`/booking/success?bookingId=${bookingRes.data.id}`);
          } catch (err) {
            setError('Payment verification failed. Please contact support.');
            setLoading(false);
          }
        },
        prefill: {
          name: customerDetails.name,
          email: customerDetails.email,
          contact: customerDetails.phone
        },
        theme: {
          color: "#1E3F20" 
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setStatus('idle');
          }
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError('Payment failed: ' + response.error.description);
        setLoading(false);
        setStatus('idle');
      });
      rzp.open();
      
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to initialize checkout');
      setLoading(false);
      setStatus('idle');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 text-center py-4">
      
      <div className="w-16 h-16 mx-auto bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-6">
        <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
      </div>

      <div className="space-y-3 mb-6 text-center">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">4. Review & Payment</h2>
        <p className="text-sm text-gray-500 font-light">Confirm your booking details on the right and proceed to secure checkout.</p>
      </div>
      
      <div className="max-w-xs mx-auto pt-6">
        {loading || status !== 'idle' ? (
          <div className="space-y-4 py-6">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
            <p className="text-[#1E3F20] font-medium text-sm">
              {status === 'creating_booking' && 'Securing your booking...'}
              {status === 'initializing_payment' && 'Connecting to secure gateway...'}
              {status === 'awaiting_payment' && 'Please complete payment in the popup window.'}
              {status === 'idle' && 'Processing...'}
            </p>
          </div>
        ) : error ? (
          <div className="space-y-6">
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
            <button 
              onClick={handleCheckout}
              className="w-full py-4 bg-[#1E3F20] rounded-xl text-white font-bold tracking-widest uppercase text-xs hover:bg-[#D4AF37] transition-colors duration-300 shadow-md flex justify-center items-center gap-2"
            >
              Try Again <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onBack}
              className="w-full py-4 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 hover:text-[#1E3F20] transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button 
              onClick={handleCheckout}
              className="w-full py-4 bg-[#1E3F20] rounded-xl text-white font-bold tracking-widest uppercase text-xs hover:bg-[#D4AF37] transition-colors duration-300 shadow-xl hover:shadow-2xl flex justify-center items-center gap-2"
            >
              Confirm & Pay <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onBack}
              className="w-full py-4 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 hover:text-[#1E3F20] transition-colors"
            >
              Go Back
            </button>
            
            <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Payments are secure and encrypted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
