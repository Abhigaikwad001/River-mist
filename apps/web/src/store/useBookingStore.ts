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
  customerDetails: null,
  
  setDate: (date) => set({ date }),
  setType: (type) => set({ type, packageId: null }), // Reset package when type changes
  setGuests: (headCountAdult, headCountChild) => set({ headCountAdult, headCountChild }),
  setPackage: (packageId) => set({ packageId }),
  toggleActivity: (activityId) => set((state) => ({
    activityIds: state.activityIds.includes(activityId)
      ? state.activityIds.filter(id => id !== activityId)
      : [...state.activityIds, activityId]
  })),
  setCustomerDetails: (customerDetails) => set({ customerDetails }),
  reset: () => set({
    date: undefined,
    type: 'DAY_TOURISM',
    headCountAdult: 2,
    headCountChild: 0,
    packageId: null,
    activityIds: [],
    customerDetails: null,
  }),
}));
