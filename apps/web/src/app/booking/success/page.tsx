"use client";

import Link from 'next/link';
import { CheckCircle2, MessageSquare, HelpCircle, Phone, Calendar, Users, Package, Mail } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { buildWhatsAppMessageUrl, CONTACT_CONFIG } from '@/lib/config';
import api from '@/lib/api';

interface CachedBooking {
  bookingNumber?: string;
  bookingId?: number | string;
  packageName?: string;
  dateStr?: string;
  headCountAdult?: number;
  headCountChild?: number;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  totalAmount?: number;
  subtotalAmount?: number;
  discountAmount?: number;
  discountCode?: string;
  advanceRequired?: number;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId');
  const bookingNumberParam = searchParams.get('bookingNumber');

  const [booking, setBooking] = useState<CachedBooking | null>(null);
  const [backendConfirmed, setBackendConfirmed] = useState(false);

  // Read purely presentation/receipt details from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('rm_last_booking');
        if (cached) {
          const parsed = JSON.parse(cached);
          setBooking(parsed);
        }
      } catch (e) {
        console.warn('Could not read cached booking from sessionStorage', e);
      }
    }
  }, []);

  // Authoritative Verification: only legitimate backend status can mark a booking as confirmed.
  // URL params, sessionStorage, and client-side flags CANNOT manufacture confirmation.
  useEffect(() => {
    const numericId = bookingIdParam ? Number(bookingIdParam) : (booking?.bookingId ? Number(booking.bookingId) : null);
    if (numericId && !isNaN(numericId) && numericId > 0) {
      api.get(`/bookings/status/${numericId}`)
        .then((res) => {
          if (res.data?.status === 'CONFIRMED') {
            setBackendConfirmed(true);
          } else {
            setBackendConfirmed(false);
          }
        })
        .catch(() => {
          // Unauthenticated / guest / forbidden / invalid ID: strictly default to unconfirmed
          setBackendConfirmed(false);
        });
    }
  }, [bookingIdParam, booking?.bookingId]);

  const reference = bookingNumberParam || booking?.bookingNumber || (bookingIdParam ? `#${bookingIdParam}` : null);

  const waUrl = reference
    ? buildWhatsAppMessageUrl({
        bookingNumber: reference,
        packageName: booking?.packageName || 'Agro Tourism Visit',
        dateStr: booking?.dateStr || '',
        headCountAdult: booking?.headCountAdult || 2,
        headCountChild: booking?.headCountChild || 0,
        guestName: booking?.guestName || 'Guest',
        guestPhone: booking?.guestPhone || '',
        totalAmount: booking?.totalAmount || 0,
      })
    : null;

  return (
    <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl max-w-xl w-full text-center border border-[#D4AF37]/30 relative overflow-hidden my-8">
      <div className="absolute top-0 left-0 w-full h-2 bg-[#1E3F20]"></div>

      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#1E3F20] shadow-inner">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 mb-2">
        {backendConfirmed ? 'Booking Confirmed!' : 'Booking Request Sent!'}
      </h1>

      <p className="text-gray-600 mb-6 font-light text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
        {backendConfirmed
          ? 'Your reservation is confirmed by our resort team. We look forward to welcoming you to River Mist!'
          : 'Thank you! Your booking request has been dispatched. Our team will verify availability and contact you on WhatsApp with payment details.'}
      </p>

      {/* Reference Card */}
      {reference && (
        <div className="bg-[#FAF9F6] p-4 rounded-2xl mb-6 border border-[#D4AF37]/30 text-left space-y-2">
          <div className="flex justify-between items-center border-b border-gray-200 pb-2">
            <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Booking Reference</span>
            <span className="text-base font-bold text-[#1E3F20] font-mono">{reference}</span>
          </div>

          {booking?.packageName && (
            <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-1.5">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#D4AF37]" /> Package
              </span>
              <span className="font-semibold text-gray-800">{booking.packageName}</span>
            </div>
          )}

          {booking?.dateStr && (
            <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-1.5">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" /> Date
              </span>
              <span className="font-semibold text-gray-800">{booking.dateStr}</span>
            </div>
          )}

          {booking?.headCountAdult !== undefined && (
            <div className="flex justify-between items-center text-xs border-b border-gray-100 pb-1.5">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#D4AF37]" /> Guests
              </span>
              <span className="font-semibold text-gray-800">
                {booking.headCountAdult} Adults{booking.headCountChild ? `, ${booking.headCountChild} Children` : ''}
              </span>
            </div>
          )}

          {booking?.totalAmount !== undefined && booking.totalAmount > 0 && (
            <div className="flex justify-between items-center pt-1 text-xs">
              <span className="text-gray-500 font-semibold uppercase tracking-wider">Estimated Total</span>
              <span className="text-sm font-bold text-[#1E3F20]">₹{booking.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
      )}

      {/* Process Roadmap */}
      {backendConfirmed ? (
        <div className="bg-[#FAF9F6] border border-emerald-200 rounded-2xl p-5 mb-6 text-left space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Confirmed Reservation
          </p>
          <ol className="space-y-1.5 text-xs text-gray-600 list-decimal pl-4 leading-relaxed">
            <li><strong>Reservation Confirmed:</strong> Your booking is verified and locked in our system.</li>
            <li><strong>Concierge Welcome:</strong> Our team will reach out on WhatsApp with directions and arrival details.</li>
            <li><strong>Enjoy Your Stay:</strong> Experience the serenity and organic beauty of River Mist!</li>
          </ol>
        </div>
      ) : (
        <div className="bg-[#FAF9F6] border border-gray-200 rounded-2xl p-5 mb-6 text-left space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1E3F20] flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#D4AF37]" /> Next Steps
          </p>
          <ol className="space-y-1.5 text-xs text-gray-600 list-decimal pl-4 leading-relaxed">
            <li><strong>Staff checks availability:</strong> We review the date & room allotment.</li>
            <li><strong>WhatsApp Concierge:</strong> We connect with you directly with your quote.</li>
            <li><strong>Payment instructions:</strong> Verified UPI & bank instructions provided upon approval.</li>
            <li><strong>Official Confirmation:</strong> Your booking is finalized as soon as payment is confirmed.</li>
          </ol>
        </div>
      )}

      {/* WhatsApp Re-connect Button if available */}
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#1EBE5B] transition-colors flex items-center justify-center gap-2 shadow-md mb-3"
        >
          <MessageSquare className="w-4 h-4" /> Continue on WhatsApp Concierge
        </a>
      )}

      {/* Contact Fallback */}
      <div className="text-[11px] text-gray-500 mb-6 flex flex-wrap items-center justify-center gap-4 pt-2">
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3 text-[#1E3F20]" /> Call Us: {CONTACT_CONFIG.phone}
        </span>
        <span className="flex items-center gap-1">
          <Mail className="w-3 h-3 text-[#1E3F20]" /> Email: {CONTACT_CONFIG.email}
        </span>
      </div>

      <Link
        href="/"
        className="block w-full py-3.5 border border-[#D4AF37] text-[#1E3F20] font-bold uppercase tracking-widest text-xs hover:bg-[#D4AF37] hover:text-white rounded-xl transition-colors duration-300"
      >
        Return to Home
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-[#1E3F20] font-serif text-lg">Loading booking details...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
