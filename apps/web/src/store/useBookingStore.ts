import { create } from 'zustand';

interface BookingState {
  // Step 1: Date & Guests
  date: Date | undefined;
  type: string;
  headCountAdult: number;
  headCountChild: number;
  
  // Step 2: Package & Add-ons
  packageId: number | null;
  activityIds: number[];
  
  // Step 4 / Offers: Promotional discount
  discountCode: string;
  appliedDiscount: {
    code: string;
    offerName: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    subtotal: number;
    finalTotal: number;
  } | null;

  // Customer Details for guest checkout or pre-filling
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  } | null;
  
  // State management functions
  setDate: (date: Date | undefined) => void;
  setType: (type: string) => void;
  setGuests: (adults: number, children: number) => void;
  setPackage: (packageId: number) => void;
  toggleActivity: (activityId: number) => void;
  setDiscountCode: (code: string) => void;
  setAppliedDiscount: (discount: any) => void;
  clearDiscount: () => void;
  setCustomerDetails: (details: { name: string; email: string; phone: string }) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  date: undefined,
  type: 'DAY_TOURISM',
  headCountAdult: 2,
  headCountChild: 0,
  packageId: null,
  activityIds: [],
  discountCode: '',
  appliedDiscount: null,
  customerDetails: null,
  
  setDate: (date) => set({ date }),
  setType: (type) => set({ type, packageId: null, discountCode: '', appliedDiscount: null }), // Reset package & discount when type changes
  setGuests: (headCountAdult, headCountChild) => set({ headCountAdult, headCountChild, discountCode: '', appliedDiscount: null }),
  setPackage: (packageId) => set({ packageId, discountCode: '', appliedDiscount: null }),
  toggleActivity: (activityId) => set((state) => ({
    activityIds: state.activityIds.includes(activityId)
      ? state.activityIds.filter(id => id !== activityId)
      : [...state.activityIds, activityId],
    discountCode: '',
    appliedDiscount: null,
  })),
  setDiscountCode: (discountCode) => set({ discountCode }),
  setAppliedDiscount: (appliedDiscount) => set({ appliedDiscount }),
  clearDiscount: () => set({ discountCode: '', appliedDiscount: null }),
  setCustomerDetails: (customerDetails) => set({ customerDetails }),
  reset: () => set({
    date: undefined,
    type: 'DAY_TOURISM',
    headCountAdult: 2,
    headCountChild: 0,
    packageId: null,
    activityIds: [],
    discountCode: '',
    appliedDiscount: null,
    customerDetails: null,
  }),
}));

