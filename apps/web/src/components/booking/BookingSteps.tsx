'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBookingStore } from '@/store/useBookingStore';
import { Step1Experience } from './Step1Experience';
import { Step2GuestsAddons } from './Step2GuestsAddons';
import { Step3Details } from './Step3Details';
import { Step4ReviewPayment } from './Step4ReviewPayment';
import { StickySummary } from './StickySummary';

const VALID_EVENT_TYPES = [
  'DAY_TOURISM', 'HURDA_PARTY', 'BIRTHDAY', 'WEDDING', 'DESTINATION_WEDDING',
  'ENGAGEMENT', 'ANNIVERSARY', 'CORPORATE_EVENT', 'SCHOOL_COLLEGE_PICNIC',
  'FAMILY_DAY_OUT', 'OTHER_EVENT'
];

export function BookingSteps() {
  const [step, setStep] = useState(1);
  const searchParams = useSearchParams();
  const setType = useBookingStore(state => state.setType);

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      const normalizedType = typeParam.toUpperCase();
      if (VALID_EVENT_TYPES.includes(normalizedType)) {
        setType(normalizedType);
      }
    }
  }, [searchParams, setType]);

  const totalSteps = 4; // 4 simple steps

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Progress Bar */}
      <div className="max-w-2xl mx-auto flex items-center justify-between mb-8 relative px-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-gray-200 -z-10" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#D4AF37] -z-10 transition-all duration-700 ease-out" 
          style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
        />
        
        {Array.from({ length: totalSteps }).map((_, i) => {
          const s = i + 1;
          const labels = ['Experience', 'Guests', 'Details', 'Payment'];
          return (
            <div key={s} className="flex flex-col items-center gap-2">
              <div 
                className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-all duration-500 border-2 relative bg-white ${
                  s < step ? 'bg-[#D4AF37] border-[#D4AF37] text-white' : s === step ? 'border-[#D4AF37] text-[#1E3F20] shadow-[0_0_10px_rgba(212,175,55,0.4)]' : 'border-gray-200 text-gray-400'
                }`}
              >
                {s}
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-bold absolute -bottom-6 whitespace-nowrap ${s <= step ? 'text-[#1E3F20]' : 'text-gray-400'}`}>
                {labels[i]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-2">
          <div className="bg-white p-5 md:p-8 rounded-3xl shadow-2xl shadow-black/10 border border-[#D4AF37]/20 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1E3F20] via-[#D4AF37] to-[#1E3F20]" />
            
            {step === 1 && <Step1Experience onNext={() => setStep(2)} />}
            {step === 2 && <Step2GuestsAddons onNext={() => setStep(3)} onBack={() => setStep(1)} />}
            {step === 3 && <Step3Details onNext={() => setStep(4)} onBack={() => setStep(2)} />}
            {step === 4 && <Step4ReviewPayment onBack={() => setStep(3)} />}
          </div>
        </div>

        {/* Right Column: Sticky Summary */}
        <div className="lg:col-span-1 hidden lg:block">
          <StickySummary />
        </div>
      </div>
    </div>
  );
}
