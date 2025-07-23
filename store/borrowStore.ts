import { ScannedItem } from '@/app/(tabs)/index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';


interface BorrowSlot {
  id: string;
  items: ScannedItem[];
  returned: ScannedItem[];
  note?: string;
  userId: string;
}


interface BorrowStore {
  slots: BorrowSlot[];
  addSlot: (payload: {
    items: ScannedItem[];
    note?: string;
    userId: string;
  }) => void;

  returnItems: (slotId: string, returnedItems: ScannedItem[]) => void;

  selectedSlotId: string | null;
  setSelectedSlotId: (id: string | null) => void;
}

export const useBorrowStore = create(
  persist<BorrowStore>(
    (set) => ({
      slots: [],
      addSlot: ({ items, note, userId }) =>
        set((state) => ({
          slots: [
            ...state.slots,
            {
              id: `${Date.now()}`,
              items,
              returned: [],
              note,
              userId,
            },
          ],
        })),
      returnItems: (slotId, returnedItems) =>
        set((state) => ({
          slots: state.slots.map((slot) =>
            slot.id === slotId
              ? { ...slot, returned: [...slot.returned, ...returnedItems] }
              : slot
          ),
        })),
      selectedSlotId: null,
      setSelectedSlotId: (id) => set({ selectedSlotId: id }),
    }),
    {
      name: 'borrow-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);


