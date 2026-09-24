import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, shadow } from '../theme';
import { isFirebaseConfigured, listFirebaseManagedUsers, ManagedUser, updateFirebaseUserRole } from '../services/firebase';
import { useBookingStore } from '../store/useBookingStore';

type RootStackParamList = { UserManager: undefined };
type Props = NativeStackScreenProps<RootStackParamList, 'UserManager'>;

const demoUsers: ManagedUser[] = [
  { id: 'demo-admin', name: 'Campus Admin', email: 'admin@vku.udn.vn', role: 'admin', emailVerified: true, disabled: false },
  { id: 'demo-user', name: 'VKU Student', email: 'student@vku.udn.vn', role: 'user', emailVerified: true, disabled: false },
];

export function AdminUserManagementScreen({ navigation }: Props) {
  const session = useBookingStore((state) => state.session);
  const [users, setUsers] = useState<ManagedUser[]>(demoUsers);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const loadUsers = async (reset = true) => {
    if (!isFirebaseConfigured) { setUsers(demoUsers); setLoading(false); return; }
    if (reset) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const result = await listFirebaseManagedUsers(reset ? undefined : nextCursor);
      setUsers((current) => reset ? result.users : [...current, ...result.users]);
      setNextCursor(result.nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách tài khoản.');
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void loadUsers(); }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(normalized));
  }, [query, users]);

  const confirmRoleChange = (user: ManagedUser, nextRole: 'user' | 'admin') => {
    if (user.id === session?.id) { Alert.alert('Không thể tự đổi quyền', 'Để tránh mất quyền quản trị ngoài ý muốn, Admin không thể tự hạ hoặc tự đổi role của chính mình.'); return; }
    if (user.role === nextRole) return;
    Alert.alert(nextRole === 'admin' ? 'Cấp quyền Admin?' : 'Hạ xuống User?', `${user.name} sẽ ${nextRole === 'admin' ? 'có quyền quản trị phòng và analytics' : 'không còn quyền quản trị'}.`, [{ text: 'Hủy', style: 'cancel' }, { text: 'Xác nhận', onPress: () => void commitRoleChange(user, nextRole) }]);
  };

  const commitRoleChange = async (user: ManagedUser, nextRole: 'user' | 'admin') => {
    setBusyUserId(user.id); setError('');
    try {
      const updated = isFirebaseConfigured ? await updateFirebaseUserRole(user.id, nextRole) : { ...user, role: nextRole };
      setUsers((current) => current.map((item) => item.id === user.id ? updated : item));
      Alert.alert('Đã cập nhật', `${user.email} hiện là ${nextRole === 'admin' ? 'Admin' : 'User'}.`);
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'Không thể cập nhật role.');
    } finally { setBusyUserId(null); }
  };

  if (isFirebaseConfigured && session?.role !== 'admin') return <SafeAreaView style={styles.screen}><View style={styles.denied}><View style={styles.deniedIcon}><Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} /></View><Text style={styles.deniedTitle}>Chỉ Admin mới được truy cập</Text><Text style={styles.deniedText}>Màn hình này chỉ quản lý tài khoản khác. Quyền được kiểm tra lại ở backend, không chỉ dựa vào giao diện.</Text><Pressable onPress={() => navigation.goBack()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Quay lại</Text></Pressable></View></SafeAreaView>;

  return <SafeAreaView style={styles.screen} edges={['top']}><View style={styles.header}><Pressable onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Quay lại"><Ionicons name="arrow-back" size={21} color={colors.ink} /></Pressable><View style={styles.headerCopy}><Text style={styles.kicker}>ADMIN CONSOLE</Text><Text style={styles.title}>Quản lý tài khoản</Text></View><Pressable onPress={() => void loadUsers()} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Tải lại danh sách"><Ionicons name="refresh-outline" size={21} color={colors.primary} /></Pressable></View><FlatList data={filteredUsers} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} refreshing={refreshing} onRefresh={() => void loadUsers()} onEndReached={() => { if (nextCursor && !refreshing) void loadUsers(false); }} onEndReachedThreshold={0.4} ListHeaderComponent={<><View style={styles.governanceCard}><View style={styles.governanceIcon}><Ionicons name="lock-closed-outline" size={20} color="#047857" /></View><View style={styles.flexOne}><Text style={styles.governanceTitle}>{isFirebaseConfigured ? 'Quyền production đang được bảo vệ' : 'Chế độ demo giao diện'}</Text><Text style={styles.governanceText}>{isFirebaseConfigured ? 'Mọi thay đổi đi qua backend Admin SDK. Người dùng không thể tự nâng quyền.' : 'Danh sách bên dưới là dữ liệu mẫu để kiểm thử luồng User/Admin.'}</Text></View></View><View style={styles.searchBox}><Ionicons name="search-outline" size={20} color="#64748B" /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm theo tên hoặc email" placeholderTextColor="#94A3B8" style={styles.searchInput} returnKeyType="search" /></View>{error ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void loadUsers()}><Text style={styles.retryText}>Thử lại</Text></Pressable></View> : null}<Text style={styles.sectionTitle}>{filteredUsers.length} tài khoản</Text></>} ListEmptyComponent={loading ? <View style={styles.empty}><ActivityIndicator color={colors.primary} /><Text style={styles.emptyText}>Đang tải danh sách...</Text></View> : <View style={styles.empty}><Ionicons name="people-outline" size={34} color="#94A3B8" /><Text style={styles.emptyText}>Không tìm thấy tài khoản phù hợp.</Text></View>} renderItem={({ item }) => <ManagedUserRow user={item} currentUid={session?.id} busy={busyUserId === item.id} onChangeRole={(role) => confirmRoleChange(item, role)} />} ListFooterComponent={loading && users.length > 0 ? <ActivityIndicator color={colors.primary} style={styles.footerLoader} /> : null} /></SafeAreaView>;
}

function ManagedUserRow({ user, currentUid, busy, onChangeRole }: { user: ManagedUser; currentUid?: string; busy: boolean; onChangeRole: (role: 'user' | 'admin') => void }) {
  const isSelf = user.id === currentUid;
  const isAdmin = user.role === 'admin';
  return <View style={styles.userCard}><View style={styles.userTop}><View style={[styles.avatar, isAdmin && styles.avatarAdmin]}><Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.flexOne}><View style={styles.nameRow}><Text style={styles.userName} numberOfLines={1}>{user.name}</Text><View style={[styles.rolePill, isAdmin && styles.rolePillAdmin]}><Ionicons name={isAdmin ? 'shield-checkmark-outline' : 'person-outline'} size={11} color={isAdmin ? '#047857' : colors.primary} /><Text style={[styles.rolePillText, isAdmin && styles.rolePillTextAdmin]}>{isAdmin ? 'ADMIN' : 'USER'}</Text></View></View><Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text><Text style={styles.userState}>{isSelf ? 'Tài khoản của bạn · không thể tự đổi' : user.disabled ? 'Đang bị khóa' : user.emailVerified ? 'Email đã xác minh' : 'Chưa xác minh email'}</Text></View></View><View style={styles.roleActions}><Pressable disabled={busy || isSelf || !isAdmin} onPress={() => onChangeRole('user')} style={({ pressed }) => [styles.roleButton, !isAdmin && styles.roleButtonActive, (busy || isSelf || isAdmin) && styles.roleButtonMuted, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Đổi ${user.email} thành User`}><Ionicons name="person-outline" size={15} color={!isAdmin ? colors.white : '#64748B'} /><Text style={[styles.roleButtonText, !isAdmin && styles.roleButtonTextActive]}>User</Text></Pressable><Pressable disabled={busy || isSelf || isAdmin} onPress={() => onChangeRole('admin')} style={({ pressed }) => [styles.roleButton, isAdmin && styles.roleButtonAdminActive, (busy || isSelf || !isAdmin) && styles.roleButtonMuted, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Đổi ${user.email} thành Admin`}><Ionicons name="shield-checkmark-outline" size={15} color={isAdmin ? colors.white : '#64748B'} /><Text style={[styles.roleButtonText, isAdmin && styles.roleButtonTextActiveAdmin]}>Admin</Text></Pressable>{busy ? <ActivityIndicator size="small" color={colors.primary} style={styles.rowLoader} /> : null}</View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1F8FC' },
  flexOne: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 3 },
  listContent: { padding: 20, paddingBottom: 36 },
  governanceCard: { flexDirection: 'row', gap: 11, backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, borderRadius: 18, padding: 14, ...shadow.card },
  governanceIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D1FAE5' },
  governanceTitle: { color: '#065F46', fontSize: 13, fontWeight: '900' },
  governanceText: { color: '#047857', fontSize: 11, lineHeight: 17, marginTop: 3 },
  searchBox: { height: 52, marginTop: 16, paddingHorizontal: 14, gap: 9, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: '#B9DDF0', borderRadius: 16, ...shadow.card },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, minHeight: 44 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: '#FEF2F2' },
  errorText: { color: '#B91C1C', fontSize: 11, flex: 1, lineHeight: 16 },
  retryText: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 22, marginBottom: 10 },
  userCard: { backgroundColor: colors.white, borderRadius: 18, padding: 14, marginTop: 10, borderWidth: 1, borderColor: colors.line, ...shadow.card },
  userTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sky },
  avatarAdmin: { backgroundColor: '#D1FAE5' },
  avatarText: { color: colors.primaryDark, fontSize: 17, fontWeight: '900' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  userName: { color: colors.ink, fontSize: 14, fontWeight: '900', flexShrink: 1 },
  userEmail: { color: colors.inkMuted, fontSize: 11, marginTop: 4 },
  userState: { color: '#64748B', fontSize: 10, marginTop: 4 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: colors.sky },
  rolePillAdmin: { backgroundColor: '#D1FAE5' },
  rolePillText: { color: colors.primaryDark, fontSize: 9, fontWeight: '900' },
  rolePillTextAdmin: { color: '#047857' },
  roleActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  roleButton: { minHeight: 44, flex: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: colors.line },
  roleButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleButtonAdminActive: { backgroundColor: '#059669', borderColor: '#059669' },
  roleButtonMuted: { opacity: 0.48 },
  roleButtonText: { color: '#475569', fontSize: 12, fontWeight: '900' },
  roleButtonTextActive: { color: colors.white },
  roleButtonTextActiveAdmin: { color: colors.white },
  rowLoader: { marginHorizontal: 4 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: colors.inkMuted, fontSize: 13 },
  footerLoader: { paddingVertical: 18 },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  deniedIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sky },
  deniedTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 16, textAlign: 'center' },
  deniedText: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 9 },
  primaryButton: { minHeight: 50, paddingHorizontal: 22, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
