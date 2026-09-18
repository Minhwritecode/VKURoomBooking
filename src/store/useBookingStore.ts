import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Room } from '../data/mockData';
import { signOutFirebase } from '../services/firebase';

export type Session = {
  id: string;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  emailVerified?: boolean;
};

export type ReservationStatus = 'reserved' | 'checked-in' | 'completed' | 'no-show';

export type WaitlistEntry = {
  id: string;
  roomId: string;
  roomName: string;
  building: string;
  dateKey: string;
  dateLabel: string;
  slotId: string;
  slotLabel: string;
  createdAt: string;
  status: 'waiting' | 'notified' | 'converted';
  ownerId?: string;
};

export type RoomReview = {
  id: string;
  roomId: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  note: string;
  createdAt: string;
  ownerId?: string;
};

export type Reservation = {
  id: string;
  roomId: string;
  roomName: string;
  building: string;
  dateKey: string;
  dateLabel: string;
  slotId: string;
  slotLabel: string;
  startAt: string;
  passCode: string;
  createdAt: string;
  ownerId?: string;
  status?: ReservationStatus;
  checkInAt?: string;
  completedAt?: string;
};

type BookingInput = Omit<Reservation, 'id' | 'passCode' | 'createdAt'>;

type BookingState = {
  session: Session | null;
  reservations: Reservation[];
  waitlist: WaitlistEntry[];
  reviews: RoomReview[];
  favoriteRoomIds: string[];
  syncQueue: string[];
  customRooms: Room[];
  hiddenRoomIds: string[];
  remoteRooms: Room[];
  roomOverrides: Record<string, Partial<Room>>;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setAuthSession: (session: Session | null) => void;
  login: (email: string, name?: string) => void;
  register: (name: string, email: string) => void;
  logout: () => void | Promise<void>;
  toggleFavorite: (roomId: string) => void;
  markSyncPending: (reservationId: string) => void;
  clearSyncPending: (reservationId: string) => void;
  createRoom: (room: Room) => void;
  deleteRoom: (roomId: string) => void;
  setRemoteRooms: (rooms: Room[]) => void;
  setRemoteReservations: (reservations: Reservation[]) => void;
  setRemoteWaitlist: (entries: WaitlistEntry[]) => void;
  setRemoteReviews: (reviews: RoomReview[]) => void;
  createReservation: (input: BookingInput) => Reservation;
  cancelReservation: (id: string) => void;
  checkInReservation: (id: string, passCode: string) => { ok: boolean; message: string };
  completeReservation: (id: string) => void;
  markExpiredReservations: () => void;
  joinWaitlist: (input: Omit<WaitlistEntry, 'id' | 'createdAt' | 'status'>) => WaitlistEntry;
  leaveWaitlist: (id: string) => void;
  addReview: (input: Omit<RoomReview, 'id' | 'createdAt' | 'authorName'>) => RoomReview | null;
  updateRoom: (roomId: string, patch: Partial<Room>) => void;
};

function makePassCode(): string {
  return `VKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get): BookingState => ({
      session: null,
      reservations: [],
      waitlist: [],
      reviews: [],
      favoriteRoomIds: [],
      syncQueue: [],
      customRooms: [],
      hiddenRoomIds: [],
      remoteRooms: [],
      roomOverrides: {},
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setAuthSession: (session) => set({ session }),
      login: (email, name) =>
        set({
          session: {
            id: email.toLowerCase(),
            email: email.toLowerCase(),
            name: name || email.split('@')[0] || 'VKU Student',
          },
        }),
      register: (name, email) =>
        set({ session: { id: email.toLowerCase(), name, email: email.toLowerCase() } }),
      logout: async () => { await signOutFirebase().catch(() => undefined); set({ session: null }); },
      toggleFavorite: (roomId) =>
        set((state) => ({ favoriteRoomIds: state.favoriteRoomIds.includes(roomId) ? state.favoriteRoomIds.filter((id) => id !== roomId) : [...state.favoriteRoomIds, roomId] })),
      markSyncPending: (reservationId) =>
        set((state) => ({ syncQueue: state.syncQueue.includes(reservationId) ? state.syncQueue : [...state.syncQueue, reservationId] })),
      clearSyncPending: (reservationId) =>
        set((state) => ({ syncQueue: state.syncQueue.filter((id) => id !== reservationId) })),
      createRoom: (room) => set((state) => ({ customRooms: [...state.customRooms, room] })),
      deleteRoom: (roomId) => set((state) => ({ customRooms: state.customRooms.filter((room) => room.id !== roomId), hiddenRoomIds: state.hiddenRoomIds.includes(roomId) ? state.hiddenRoomIds : [...state.hiddenRoomIds, roomId] })),
      setRemoteRooms: (remoteRooms) => set({ remoteRooms }),
      setRemoteReservations: (remoteReservations) => set((state) => {
        const queuedIds = new Set(state.syncQueue);
        const localPending = state.reservations.filter((item) => queuedIds.has(item.id));
        const merged = new Map([...remoteReservations, ...localPending].map((item) => [item.id, item]));
        return { reservations: [...merged.values()].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()) };
      }),
      setRemoteWaitlist: (remoteWaitlist) => set({ waitlist: [...remoteWaitlist].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) }),
      setRemoteReviews: (remoteReviews) => set({ reviews: [...remoteReviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) }),
      createReservation: (input) => {
        const ownerId = input.ownerId || get().session?.id;
        const reservation: Reservation = {
          ...input,
          ...(ownerId ? { ownerId } : {}),
          id: `booking-${Date.now()}`,
          passCode: makePassCode(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ reservations: [reservation, ...state.reservations], syncQueue: state.syncQueue.includes(reservation.id) ? state.syncQueue : [...state.syncQueue, reservation.id] }));
        return reservation;
      },
      cancelReservation: (id) => {
        const reservation = get().reservations.find((item) => item.id === id);
        if (!reservation) return;
        set((state) => ({
          reservations: state.reservations.filter((item) => item.id !== id),
          syncQueue: state.syncQueue.filter((item) => item !== id),
          waitlist: state.waitlist.map((item) => item.roomId === reservation.roomId && item.dateKey === reservation.dateKey && item.slotId === reservation.slotId && item.status === 'waiting' ? { ...item, status: 'notified' } : item),
        }));
      },
      checkInReservation: (id, passCode) => {
        const state = get();
        const reservation = state.reservations.find((item) => item.id === id);
        if (!reservation) return { ok: false, message: 'Không tìm thấy booking này.' };
        if (reservation.passCode !== passCode.trim().toUpperCase()) return { ok: false, message: 'Mã QR không khớp với booking.' };
        if (reservation.status === 'checked-in') return { ok: false, message: 'Booking này đã check-in rồi.' };
        if (reservation.status === 'no-show') return { ok: false, message: 'Booking đã bị đánh dấu no-show.' };
        set((current) => ({ reservations: current.reservations.map((item) => item.id === id ? { ...item, status: 'checked-in', checkInAt: new Date().toISOString() } : item) }));
        return { ok: true, message: 'Check-in thành công. Chúc bạn học tập hiệu quả!' };
      },
      completeReservation: (id) => set((state) => ({ reservations: state.reservations.map((item) => item.id === id ? { ...item, status: 'completed', completedAt: new Date().toISOString() } : item) })),
      markExpiredReservations: () => {
        const now = Date.now();
        set((state) => ({ reservations: state.reservations.map((item) => {
          if ((item.status || 'reserved') !== 'reserved') return item;
          const endAt = new Date(item.startAt).getTime() + 2 * 60 * 60 * 1000;
          return endAt < now ? { ...item, status: 'no-show', completedAt: new Date().toISOString() } : item;
        }) }));
      },
      joinWaitlist: (input) => {
        const existing = get().waitlist.find((item) => item.roomId === input.roomId && item.dateKey === input.dateKey && item.slotId === input.slotId && item.status === 'waiting');
        if (existing) return existing;
        const session = get().session;
        const entry: WaitlistEntry = { ...input, id: `wait-${Date.now()}`, createdAt: new Date().toISOString(), status: 'waiting', ...(session?.id ? { ownerId: session.id } : {}) };
        set((state) => ({ waitlist: [entry, ...state.waitlist] }));
        return entry;
      },
      leaveWaitlist: (id) => set((state) => ({ waitlist: state.waitlist.filter((item) => item.id !== id) })),
      addReview: (input) => {
        const state = get();
        const session = state.session;
        if (!session) return null;
        const existing = state.reviews.find((item) => item.roomId === input.roomId && (item.ownerId ? item.ownerId === session.id : item.authorName === session.name));
        if (existing) return existing;
        const review: RoomReview = { ...input, id: `review-${Date.now()}`, authorName: session.name, createdAt: new Date().toISOString(), ownerId: session.id };
        set((current) => ({ reviews: [review, ...current.reviews] }));
        return review;
      },
      updateRoom: (roomId, patch) =>
        set((state) => ({ roomOverrides: { ...state.roomOverrides, [roomId]: { ...state.roomOverrides[roomId], ...patch } } })),
    }),
    {
      name: 'vku-room-booking-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session, reservations: state.reservations, waitlist: state.waitlist, reviews: state.reviews, favoriteRoomIds: state.favoriteRoomIds, syncQueue: state.syncQueue, customRooms: state.customRooms, hiddenRoomIds: state.hiddenRoomIds, roomOverrides: state.roomOverrides }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
