import { getApp, getApps, initializeApp } from 'firebase/app';
import { collection, doc, getFirestore, onSnapshot, runTransaction, type Unsubscribe } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import type { Room } from '../data/mockData';
import type { Reservation } from '../store/useBookingStore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

function getDb() {
  if (!isFirebaseConfigured) return null;
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  return getFirestore(app);
}

function getFirebaseApp() {
  if (!isFirebaseConfigured) return null;
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

export async function uploadRoomImage(uri: string, roomId: string): Promise<string> {
  const app = getFirebaseApp();
  if (!app || uri.startsWith('https://')) return uri;
  const blob = await (await fetch(uri)).blob();
  const imageRef = ref(getStorage(app), `rooms/${roomId}/${Date.now()}.jpg`);
  await uploadBytes(imageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(imageRef);
}

export function subscribeToFirebaseRooms(onRooms: (rooms: Room[]) => void): Unsubscribe {
  const db = getDb();
  if (!db) return () => undefined;
  return onSnapshot(collection(db, 'rooms'), (snapshot) => {
    onRooms(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Room)));
  });
}

export async function createFirebaseBooking(reservation: Reservation): Promise<void> {
  const db = getDb();
  if (!db) return;
  const bookingKey = `${reservation.roomId}_${reservation.dateKey}_${reservation.slotId}`;
  await runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, 'bookings', bookingKey);
    const existing = await transaction.get(bookingRef);
    if (existing.exists()) throw new Error('SLOT_CONFLICT');
    transaction.set(bookingRef, reservation);
  });
}
