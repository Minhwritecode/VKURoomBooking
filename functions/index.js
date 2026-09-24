const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2/options');

initializeApp();
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 });

const db = getFirestore();
const auth = getAuth();
const pageSize = 25;

async function assertAdmin(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Bạn cần đăng nhập.');
  if (request.auth.token?.admin === true || request.auth.token?.role === 'admin') return request.auth.uid;
  const profile = await db.doc(`users/${request.auth.uid}`).get();
  if (profile.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Chỉ Admin mới được quản lý tài khoản.');
  return request.auth.uid;
}

function normalizeRole(value) {
  return value === 'admin' ? 'admin' : value === 'user' ? 'user' : null;
}

exports.listUsers = onCall(async (request) => {
  await assertAdmin(request);
  const cursor = typeof request.data?.cursor === 'string' ? request.data.cursor : undefined;
  let query = db.collection('users').orderBy('uid').limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const users = snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      name: String(data.name || 'VKU Student'),
      email: String(data.email || ''),
      role: data.role === 'admin' ? 'admin' : 'user',
      emailVerified: Boolean(data.emailVerified),
      disabled: Boolean(data.disabled),
    };
  });
  return { users, nextCursor: snapshot.size === pageSize ? users[users.length - 1]?.id : undefined };
});

exports.setUserRole = onCall(async (request) => {
  const callerUid = await assertAdmin(request);
  const userId = typeof request.data?.userId === 'string' ? request.data.userId.trim() : '';
  const role = normalizeRole(request.data?.role);
  if (!userId || !role) throw new HttpsError('invalid-argument', 'userId và role là bắt buộc.');
  if (callerUid === userId) throw new HttpsError('failed-precondition', 'Không thể tự đổi role của chính mình.');

  const targetRef = db.doc(`users/${userId}`);
  const targetSnapshot = await targetRef.get();
  if (!targetSnapshot.exists) throw new HttpsError('not-found', 'Không tìm thấy hồ sơ tài khoản.');
  const target = targetSnapshot.data();
  const currentRole = target.role === 'admin' ? 'admin' : 'user';
  if (currentRole === role) return { user: { id: userId, name: String(target.name || 'VKU Student'), email: String(target.email || ''), role: currentRole, emailVerified: Boolean(target.emailVerified), disabled: Boolean(target.disabled) } };

  if (currentRole === 'admin' && role === 'user') {
    const admins = await db.collection('users').where('role', '==', 'admin').limit(2).get();
    if (admins.size <= 1) throw new HttpsError('failed-precondition', 'Không thể hạ Admin cuối cùng. Hãy cấp một Admin thay thế trước.');
  }

  const targetAuth = await auth.getUser(userId);
  const claims = { ...(targetAuth.customClaims || {}), role, admin: role === 'admin' };
  await auth.setCustomUserClaims(userId, claims);
  await targetRef.set({ role, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { user: { id: userId, name: String(target.name || 'VKU Student'), email: String(target.email || targetAuth.email || ''), role, emailVerified: Boolean(target.emailVerified || targetAuth.emailVerified), disabled: Boolean(target.disabled || targetAuth.disabled) } };
});
