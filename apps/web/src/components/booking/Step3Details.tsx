'use client';
import { useState, useEffect } from 'react';
import { useBookingStore } from '@/store/useBookingStore';
import { User, Mail, Phone, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export function Step3Details({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const { customerDetails, setCustomerDetails } = useBookingStore();
  
  const [formData, setFormData] = useState({
    name: customerDetails?.name || '',
    email: customerDetails?.email || '',
    phone: customerDetails?.phone || ''
  });
  
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const res = await api.get('/users/me');
        if (res.data) {
          setIsAuthenticated(true);
          setFormData({
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || ''
          });
          // Auto-save to store
          setCustomerDetails({
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || ''
          });
        }
      } catch (err) {
        // Not logged in or error, keep form empty for guest checkout
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [setCustomerDetails]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerDetails(formData);
    onNext();
  };

  const isFormValid = formData.name.trim() !== '' && formData.email.trim() !== '' && formData.phone.trim() !== '';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        <p className="text-[#1E3F20] font-serif">Verifying your details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
      <div className="space-y-3 mb-6">
        <h2 className="text-2xl md:text-3xl font-serif text-[#1E3F20] font-bold">3. Your Details</h2>
        <p className="text-sm text-gray-500 font-light">
          {isAuthenticated ? 'Please confirm your contact information.' : 'Please provide your contact information to complete the booking.'}
        </p>
      </div>

      <form id="customer-details-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="relative group">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-hover:text-[#D4AF37] transition-colors" />
          <input 
            type="text" 
            name="name"
            placeholder="Full Name"
            required
            value={formData.name}
            onChange={handleChange}
            readOnly={isAuthenticated}
            className={`w-full pl-12 pr-4 py-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all ${isAuthenticated ? 'text-gray-500 cursor-not-allowed' : 'text-gray-700 hover:border-[#D4AF37]'}`}
          />
        </div>

        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-hover:text-[#D4AF37] transition-colors" />
          <input 
            type="email" 
            name="email"
            placeholder="Email Address"
            required
            value={formData.email}
            onChange={handleChange}
            readOnly={isAuthenticated}
            className={`w-full pl-12 pr-4 py-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all ${isAuthenticated ? 'text-gray-500 cursor-not-allowed' : 'text-gray-700 hover:border-[#D4AF37]'}`}
          />
        </div>

        <div className="relative group">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-hover:text-[#D4AF37] transition-colors" />
          <input 
            type="tel" 
            name="phone"
            placeholder="Phone Number"
            required
            value={formData.phone}
            onChange={handleChange}
            readOnly={isAuthenticated}
            className={`w-full pl-12 pr-4 py-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all ${isAuthenticated ? 'text-gray-500 cursor-not-allowed' : 'text-gray-700 hover:border-[#D4AF37]'}`}
          />
        </div>
      </form>

      {!isAuthenticated && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
          <div className="text-blue-500 mt-0.5">ℹ️</div>
          <div>
            <h4 className="text-sm font-bold text-blue-900">Checking out as a guest</h4>
            <p className="text-xs text-blue-700 mt-1">You will receive your booking confirmation via email. An account will be created automatically for you to manage your booking later.</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button 
          onClick={onBack}
          type="button"
          className="w-1/3 py-4 border border-gray-200 rounded-xl text-gray-600 font-bold uppercase tracking-widest text-xs hover:bg-gray-50 hover:text-[#1E3F20] transition-colors"
        >
          Go Back
        </button>
        <button 
          type="submit"
          form="customer-details-form"
          disabled={!isFormValid}
          className="w-2/3 py-4 bg-[#1E3F20] rounded-xl text-white font-bold tracking-widest uppercase text-xs disabled:opacity-50 hover:bg-[#D4AF37] transition-colors duration-300 shadow-md"
        >
          Proceed to Review
        </button>
      </div>
    </div>
  );
}
