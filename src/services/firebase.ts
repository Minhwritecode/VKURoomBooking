import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, initializeAuth, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile, type Auth, type User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getFirestore, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where, type Unsubscribe } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Room } from '../data/mockData';
import type { Reservation, RoomReview, Session, WaitlistEntry } from '../store/useBookingStore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
let authInstance: Auth | null = null;

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  disabled: boolean;
};

function getFirebaseFunctions() {
  const app = getFirebaseApp();
  return app ? getFunctions(app, 'asia-southeast1') : null;
}

function toFriendlyRoleError(error: unknown): Error {
  const code = String((error as { code?: string })?.code || '');
  const messages: Record<string, string> = {
    'functions/permission-denied': 'Bạn không có quyền quản lý tài khoản.',
    'functions/failed-precondition': 'Thao tác bị từ chối để bảo vệ hệ thống, ví dụ không thể hạ Admin cuối cùng.',
    'functions/not-found': 'Không tìm thấy tài khoản hoặc backend quản lý quyền chưa được deploy.',
    'functions/unavailable': 'Dịch vụ quản lý tài khoản đang tạm thời không khả dụng.',
    'functions/internal': 'Backend quản lý quyền chưa sẵn sàng. Hãy deploy Firebase Functions rồi thử lại.',
  };
  return new Error(messages[code] || 'Không thể cập nhật quyền tài khoản. Hãy thử lại.');
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

function getDb() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (authInstance) return authInstance;
  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
    return authInstance;
  }
  try {
    const getReactNativePersistence = (require('firebase/auth') as { getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown }).getReactNativePersistence;
    authInstance = getReactNativePersistence ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) as never }) : getAuth(app);
  } catch {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export type FirebaseAuthSession = Session & { emailVerified: boolean };

function toFriendlyAuthError(error: unknown): Error {
  const code = String((error as { code?: string })?.code || '');
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/weak-password': 'Mật khẩu quá yếu. Hãy dùng ít nhất 6 ký tự.',
    'auth/user-disabled': 'Tài khoản đã bị khóa. Hãy liên hệ quản trị viên.',
    'auth/network-request-failed': 'Không thể kết nối Firebase. Kiểm tra mạng rồi thử lại.',
    'auth/too-many-requests': 'Có quá nhiều lần thử. Hãy chờ một lúc rồi thử lại.',
  };
  return new Error(messages[code] || 'Không thể xác thực tài khoản. Hãy thử lại.');
}

async function ensureUserProfile(user: User, preferredName?: string): Promise<FirebaseAuthSession> {
  const db = getDb();
  if (!db) throw new Error('Firebase chưa được cấu hình.');
  const profileRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(profileRef);
  const profile = snapshot.exists() ? snapshot.data() : {};
  const name = preferredName?.trim() || String(profile.name || user.displayName || user.email?.split('@')[0] || 'VKU Student');
  if (!snapshot.exists() || preferredName?.trim()) {
    await setDoc(profileRef, { uid: user.uid, name, email: user.email || '', role: profile.role || 'user', updatedAt: serverTimestamp(), ...(snapshot.exists() ? {} : { createdAt: serverTimestamp() }) }, { merge: true });
  }
  return { id: user.uid, name, email: user.email || '', role: profile.role === 'admin' ? 'admin' : 'user', emailVerified: user.emailVerified };
}

export async function registerWithFirebase(name: string, email: string, password: string): Promise<FirebaseAuthSession> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase chưa được cấu hình.');
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
    const session = await ensureUserProfile(credential.user, name);
    await sendEmailVerification(credential.user).catch(() => undefined);
    return session;
  } catch (error) {
    throw toFriendlyAuthError(error);
  }
}

export async function loginWithFirebase(email: string, password: string): Promise<FirebaseAuthSession> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase chưa được cấu hình.');
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    return ensureUserProfile(credential.user);
  } catch (error) {
    throw toFriendlyAuthError(error);
  }
}

export function subscribeToFirebaseAuth(onSession: (session: FirebaseAuthSession | null) => void, onError?: (error: Error) => void): Unsubscribe {
  const auth = getFirebaseAuth();
  if (!auth) return () => undefined;
  return onAuthStateChanged(auth, (user) => {
    if (!user) { onSession(null); return; }
    void ensureUserProfile(user).then(onSession).catch((error) => onError?.(toFriendlyAuthError(error)));
  });
}

export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) await signOut(auth);
}

export async function resetFirebasePassword(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase chưa được cấu hình.');
  try { await sendPasswordResetEmail(auth, email.trim().toLowerCase()); } catch (error) { throw toFriendlyAuthError(error); }
}

export async function updateFirebaseProfileName(name: string): Promise<FirebaseAuthSession> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error('AUTH_REQUIRED');
  const normalizedName = name.trim();
  if (normalizedName.length < 2) throw new Error('Tên cần ít nhất 2 ký tự.');
  await updateProfile(auth.currentUser, { displayName: normalizedName });
  return ensureUserProfile(auth.currentUser, normalizedName);
}

export async function resendFirebaseVerification(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error('AUTH_REQUIRED');
  await sendEmailVerification(auth.currentUser);
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
  return onSnapshot(collection(db, 'rooms'), (snapshot) => onRooms(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Room))));
}

export async function createFirebaseRoom(room: Room): Promise<void> {
  const db = getDb();
  if (!db || !getFirebaseAuth()?.currentUser) throw new Error('AUTH_REQUIRED');
  await setDoc(doc(db, 'rooms', room.id), { ...room, updatedAt: serverTimestamp() });
}

export async function updateFirebaseRoom(roomId: string, patch: Partial<Room>): Promise<void> {
  const db = getDb();
  if (!db || !getFirebaseAuth()?.currentUser) throw new Error('AUTH_REQUIRED');
  await setDoc(doc(db, 'rooms', roomId), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteFirebaseRoom(roomId: string): Promise<void> {
  const db = getDb();
  if (!db || !getFirebaseAuth()?.currentUser) throw new Error('AUTH_REQUIRED');
  await deleteDoc(doc(db, 'rooms', roomId));
}

export function subscribeToFirebaseBookings(uid: string, onReservations: (reservations: Reservation[]) => void): Unsubscribe {
  const db = getDb();
  if (!db || !uid) return () => undefined;
  const bookingsQuery = query(collection(db, 'bookings'), where('ownerId', '==', uid));
  return onSnapshot(bookingsQuery, (snapshot) => {
    const reservations = snapshot.docs.map((item) => item.data() as Reservation).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    onReservations(reservations);
  });
}

export function subscribeToFirebaseWaitlist(uid: string, onEntries: (entries: WaitlistEntry[]) => void): Unsubscribe {
  const db = getDb();
  if (!db || !uid) return () => undefined;
  return onSnapshot(query(collection(db, 'waitlist'), where('ownerId', '==', uid)), (snapshot) => {
    onEntries(snapshot.docs.map((item) => item.data() as WaitlistEntry).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });
}

export function subscribeToFirebaseReviews(uid: string, onReviews: (reviews: RoomReview[]) => void): Unsubscribe {
  const db = getDb();
  if (!db || !uid) return () => undefined;
  return onSnapshot(query(collection(db, 'reviews'), where('ownerId', '==', uid)), (snapshot) => {
    onReviews(snapshot.docs.map((item) => item.data() as RoomReview).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });
}

export async function createFirebaseWaitlist(entry: WaitlistEntry): Promise<void> {
  const db = getDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser) throw new Error('AUTH_REQUIRED');
  await setDoc(doc(db, 'waitlist', entry.id), { ...entry, ownerId: auth.currentUser.uid, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteFirebaseWaitlist(entryId: string): Promise<void> {
  const db = getDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser) return;
  await deleteDoc(doc(db, 'waitlist', entryId));
}

export async function createFirebaseReview(review: RoomReview): Promise<void> {
  const db = getDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser) throw new Error('AUTH_REQUIRED');
  await setDoc(doc(db, 'reviews', review.id), { ...review, ownerId: auth.currentUser.uid, updatedAt: serverTimestamp() }, { merge: true });
}

export async function createFirebaseBooking(reservation: Reservation): Promise<void> {
  const db = getDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser) throw new Error('AUTH_REQUIRED');
  const ownerId = reservation.ownerId || auth.currentUser.uid;
  const bookingKey = `${reservation.roomId}_${reservation.dateKey}_${reservation.slotId}`;
  await runTransaction(db, async (transaction) => {
    const bookingRef = doc(db, 'bookings', bookingKey);
    const existing = await transaction.get(bookingRef);
    if (existing.exists()) throw new Error('SLOT_CONFLICT');
    transaction.set(bookingRef, { ...reservation, ownerId, updatedAt: serverTimestamp() });
  });
}

export async function deleteFirebaseBooking(reservation: Reservation): Promise<void> {
  const db = getDb();
  const auth = getFirebaseAuth();
  if (!db || !auth?.currentUser) return;
  await deleteDoc(doc(db, 'bookings', `${reservation.roomId}_${reservation.dateKey}_${reservation.slotId}`));
}

export async function listFirebaseManagedUsers(cursor?: string): Promise<{ users: ManagedUser[]; nextCursor?: string }> {
  const functions = getFirebaseFunctions();
  if (!functions || !getFirebaseAuth()?.currentUser) throw new Error('AUTH_REQUIRED');
  try {
    const callable = httpsCallable<{ cursor?: string }, { users: ManagedUser[]; nextCursor?: string }>(functions, 'listUsers');
    const result = await callable(cursor ? { cursor } : {});
    return result.data;
  } catch (error) {
    throw toFriendlyRoleError(error);
  }
}

export async function updateFirebaseUserRole(userId: string, role: 'user' | 'admin'): Promise<ManagedUser> {
  const functions = getFirebaseFunctions();
  if (!functions || !getFirebaseAuth()?.currentUser) throw new Error('AUTH_REQUIRED');
  try {
    const callable = httpsCallable<{ userId: string; role: 'user' | 'admin' }, { user: ManagedUser }>(functions, 'setUserRole');
    const result = await callable({ userId, role });
    return result.data.user;
  } catch (error) {
    throw toFriendlyRoleError(error);
  }
}
