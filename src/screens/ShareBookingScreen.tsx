import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, shadow } from '../theme';
import { useBookingStore } from '../store/useBookingStore';

type RootStackParamList = { AppTabs: undefined; ShareBooking: undefined };
type Props = NativeStackScreenProps<RootStackParamList, 'ShareBooking'>;

async function shareReservation(reservation: ReturnType<typeof useBookingStore.getState>['reservations'][number]) {
  const message = `VKU Space\n${reservation.roomName} · Tòa ${reservation.building}\n${reservation.dateLabel} · ${reservation.slotLabel}\nMã booking: ${reservation.passCode}`;
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: 'VKU Space booking', text: message });
      return;
    }
    await Share.share({ message, title: 'Chia sẻ booking VKU Space' });
  } catch (error) {
    if ((error as Error).message !== 'AbortError') Alert.alert('Không thể chia sẻ', 'Hãy thử lại hoặc gửi mã booking thủ công.');
  }
}

export function ShareBookingScreen({ navigation }: Props) {
  const reservations = useBookingStore((state) => state.reservations);
  return <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Pressable onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Quay lại"><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable><View style={styles.headerCopy}><Text style={styles.kicker}>SHARE WITH TEAM</Text><Text style={styles.title}>Chia sẻ booking</Text></View></View>
      <Text style={styles.subtitle}>Gửi nhanh phòng, thời gian và mã check-in cho nhóm học.</Text>
      {reservations.length === 0 ? <View style={styles.empty}><Ionicons name="share-social-outline" size={35} color={colors.primary} /><Text style={styles.emptyTitle}>Chưa có booking để chia sẻ</Text><Text style={styles.emptyText}>Đặt một phòng trước, sau đó bạn có thể gửi thông tin cho nhóm.</Text></View> : reservations.map((reservation) => <View key={reservation.id} style={styles.card}><View style={styles.cardIcon}><Ionicons name="calendar-outline" size={21} color={colors.primary} /></View><View style={styles.cardCopy}><Text style={styles.roomName}>{reservation.roomName}</Text><Text style={styles.meta}>{`${reservation.dateLabel} · ${reservation.slotLabel}`}</Text><Text style={styles.pass}>{reservation.passCode}</Text></View><Pressable onPress={() => void shareReservation(reservation)} style={styles.shareButton} accessibilityLabel={`Chia sẻ ${reservation.roomName}`}><Ionicons name="share-social-outline" size={19} color={colors.white} /></Pressable></View>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.skySoft }, content: { padding: 20, paddingBottom: 120 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, headerCopy: { flex: 1 }, iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, kicker: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, title: { color: colors.ink, fontSize: 27, fontWeight: '800', marginTop: 4 }, subtitle: { color: colors.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 16, marginBottom: 20 }, card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 18, padding: 13, marginBottom: 11, ...shadow.card }, cardIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center' }, cardCopy: { flex: 1 }, roomName: { color: colors.ink, fontSize: 15, fontWeight: '800' }, meta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 }, pass: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 6 }, shareButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, empty: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 20, padding: 30, marginTop: 10, ...shadow.card }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 13, textAlign: 'center' }, emptyText: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' } });
