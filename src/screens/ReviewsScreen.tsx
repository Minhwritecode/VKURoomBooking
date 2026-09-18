import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadow } from '../theme';
import { useBookingStore } from '../store/useBookingStore';

type RootStackParamList = { AppTabs: undefined; Reviews: undefined };
type Props = NativeStackScreenProps<RootStackParamList, 'Reviews'>;
type Rating = 1 | 2 | 3 | 4 | 5;
type ReviewDraft = { rating: Rating; note: string };

const defaultDraft: ReviewDraft = { rating: 5, note: '' };

export function ReviewsScreen({ navigation }: Props) {
  const reservations = useBookingStore((state) => state.reservations);
  const reviews = useBookingStore((state) => state.reviews);
  const addReview = useBookingStore((state) => state.addReview);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const eligible = useMemo(() => reservations.filter((item) => !reviews.some((review) => review.roomId === item.roomId)), [reservations, reviews]);
  const getDraft = (reservationId: string) => drafts[reservationId] || defaultDraft;
  const updateDraft = (reservationId: string, patch: Partial<ReviewDraft>) => setDrafts((current) => ({ ...current, [reservationId]: { ...getDraft(reservationId), ...patch } }));
  const submit = (reservationId: string, roomId: string) => {
    const draft = getDraft(reservationId);
    const result = addReview({ roomId, rating: draft.rating, note: draft.note.trim() || 'Không gian phù hợp cho buổi học.' });
    if (!result) return;
    Alert.alert('Cảm ơn bạn', 'Đánh giá đã được lưu trên thiết bị.');
  };

  return <SafeAreaView style={styles.screen} edges={['top']}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><Pressable onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Quay lại"><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable><View style={styles.headerCopy}><Text style={styles.kicker}>ROOM FEEDBACK</Text><Text style={styles.title}>Đánh giá phòng</Text></View></View>
    <Text style={styles.subtitle}>Đánh giá ngắn giúp sinh viên sau chọn được không gian phù hợp hơn.</Text>
    {eligible.length === 0 ? <View style={styles.empty}><Ionicons name="sparkles-outline" size={35} color={colors.primary} /><Text style={styles.emptyTitle}>Chưa có phòng cần đánh giá</Text><Text style={styles.emptyText}>Sau khi đặt phòng, bạn có thể để lại cảm nhận ở đây.</Text></View> : eligible.map((reservation) => { const draft = getDraft(reservation.id); return <View style={styles.card} key={reservation.id}><Text style={styles.roomName}>{reservation.roomName}</Text><Text style={styles.meta}>{`${reservation.dateLabel} · ${reservation.slotLabel}`}</Text><Text style={styles.ratingLabel}>Chọn số sao</Text><View style={styles.stars}>{([1, 2, 3, 4, 5] as const).map((value) => <Pressable key={value} onPress={() => updateDraft(reservation.id, { rating: value })} style={({ pressed }) => [styles.starButton, pressed && styles.starPressed]} accessibilityRole="button" accessibilityLabel={`${value} sao cho ${reservation.roomName}`} accessibilityState={{ selected: value === draft.rating }}><Ionicons name={value <= draft.rating ? 'star' : 'star-outline'} size={28} color={value <= draft.rating ? '#F59E0B' : '#CBD5E1'} /></Pressable>)}</View><TextInput value={draft.note} onChangeText={(value) => updateDraft(reservation.id, { note: value })} placeholder="Phòng yên tĩnh, máy lạnh tốt..." placeholderTextColor="#94A3B8" style={styles.input} multiline /><Pressable onPress={() => submit(reservation.id, reservation.roomId)} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]} accessibilityRole="button"><Text style={styles.submitText}>Lưu đánh giá cho {reservation.roomName}</Text><Ionicons name="checkmark" size={18} color={colors.white} /></Pressable></View>; })}
    {reviews.length > 0 ? <><Text style={styles.sectionTitle}>Đánh giá gần đây</Text>{reviews.map((review) => <View style={styles.reviewRow} key={review.id}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} /><View style={styles.reviewCopy}><Text style={styles.reviewTitle}>{review.authorName} · {review.rating}/5</Text><Text style={styles.reviewNote}>{review.note}</Text></View></View>)}</> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.skySoft }, content: { padding: 20, paddingBottom: 120 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, headerCopy: { flex: 1 }, iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, kicker: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, title: { color: colors.ink, fontSize: 27, fontWeight: '800', marginTop: 4 }, subtitle: { color: colors.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 16, marginBottom: 20 }, card: { backgroundColor: colors.white, borderRadius: 18, padding: 17, marginBottom: 14, ...shadow.card }, roomName: { color: colors.ink, fontSize: 16, fontWeight: '800' }, meta: { color: colors.inkMuted, fontSize: 12, marginTop: 4 }, ratingLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '800', marginTop: 17 }, stars: { flexDirection: 'row', gap: 8, marginTop: 7 }, starButton: { minWidth: 38, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, starPressed: { backgroundColor: colors.amberSoft, transform: [{ scale: 0.95 }] }, input: { minHeight: 75, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surfaceMuted, color: colors.ink, padding: 12, marginTop: 15, textAlignVertical: 'top' }, submitButton: { minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingHorizontal: 10 }, pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] }, submitText: { color: colors.white, fontWeight: '800', fontSize: 12 }, sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 10, marginBottom: 10 }, reviewRow: { flexDirection: 'row', gap: 10, backgroundColor: colors.white, borderRadius: 15, padding: 14, marginBottom: 9 }, reviewCopy: { flex: 1 }, reviewTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' }, reviewNote: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 4 }, empty: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 20, padding: 30, marginTop: 10, ...shadow.card }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 13, textAlign: 'center' }, emptyText: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' } });
