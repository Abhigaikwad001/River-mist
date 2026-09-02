'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CreditCard, CheckCircle, Clock, LogOut, User, FileText } from 'lucide-react';
import api from '@/lib/api';

export default function ProfilePage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const fetchMyData = async () => {
      try {
        const [bookingsRes, quotesRes] = await Promise.all([
          api.get('/bookings/my-bookings'),
          api.get('/quotes/my-quotes')
        ]);
        setBookings(bookingsRes.data);
        setQuotes(quotesRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': 
      case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'PAYMENT_PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'REQUESTED':
      case 'SENT': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CANCELLED': 
      case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'APPROVED': return <CheckCircle className="w-4 h-4 mr-1.5" />;
      case 'PAYMENT_PENDING': return <CreditCard className="w-4 h-4 mr-1.5" />;
      default: return <Clock className="w-4 h-4 mr-1.5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1E3F20]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-32 pb-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D4AF37]/30 pb-6 gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-[#1E3F20] rounded-full flex items-center justify-center shadow-lg border-4 border-white">
              <User className="w-10 h-10 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1E3F20]">My Dashboard</h1>
              <p className="text-gray-500 font-light mt-1">Manage your bookings and quotes</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Quotes List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-serif font-bold text-[#1E3F20]">My Event Quotes</h2>
          
          {quotes.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center shadow-sm">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-light mb-4">You don't have any custom quote requests.</p>
              <button 
                onClick={() => router.push('/weddings/quote')}
                className="px-6 py-2 bg-transparent border border-[#1E3F20] text-[#1E3F20] rounded-xl font-bold tracking-widest uppercase text-[10px] hover:bg-[#1E3F20] hover:text-white transition-colors"
              >
                Request a Quote
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.map((quote) => (
                <div key={quote.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#D4AF37] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">{quote.quoteNumber}</p>
                      <h3 className="text-lg font-serif font-bold text-[#1E3F20]">Custom Quote</h3>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase border flex items-center ${getStatusColor(quote.status)}`}>
                      {getStatusIcon(quote.status)}
                      {quote.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <p><strong>Date:</strong> {new Date(quote.eventDate).toLocaleDateString()}</p>
                    <p><strong>Guests:</strong> {quote.guestCount}</p>
                  </div>

                  <div className="bg-[#FAF9F6] rounded-xl p-3 border border-gray-100 flex justify-between items-end">
                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Estimated Total</span>
                    <span className="text-lg font-serif font-bold text-[#1E3F20]">₹{quote.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-serif font-bold text-[#1E3F20]">Booking History</h2>
          
          {bookings.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#FAF9F6] rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <h3 className="text-xl font-serif text-[#1E3F20] mb-2">No bookings yet</h3>
              <p className="text-gray-500 font-light mb-6">You haven't made any reservations with us.</p>
              <button 
                onClick={() => router.push('/booking')}
                className="px-8 py-3 bg-[#1E3F20] text-white rounded-xl font-bold tracking-widest uppercase text-xs hover:bg-[#D4AF37] transition-colors"
              >
                Plan a Visit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-[#1E3F20] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Booking #{booking.id}</p>
                      <h3 className="text-lg font-serif font-bold text-[#1E3F20]">{booking.type.replace(/_/g, ' ')}</h3>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase border flex items-center ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      {booking.status}
                    </span>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 text-gray-600 text-sm">
                      <div className="w-8 h-8 bg-[#FAF9F6] rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                      <span className="font-medium">{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] rounded-2xl p-4 border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Guests</span>
                      <span className="font-medium text-[#1E3F20]">{booking.headCountAdult} Adults, {booking.headCountChild} Children</span>
                    </div>
                    
                    <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-end">
                      <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Total</span>
                      <span className="text-xl font-serif font-bold text-[#1E3F20]">₹{booking.totalAmount}</span>
                    </div>
                  </div>

                  {booking.status === 'PAYMENT_PENDING' && (
                    <button className="w-full mt-4 py-3 bg-[#D4AF37] text-[#1E3F20] font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-[#1E3F20] hover:text-white transition-colors">
                      Complete Payment
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
