import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, shadow } from '../theme';
import { useBookingStore } from '../store/useBookingStore';

type RootStackParamList = { AppTabs: undefined; RoomDetail: { roomId: string }; RoomManager: undefined; CheckIn: undefined };
type Props = NativeStackScreenProps<RootStackParamList, 'CheckIn'>;

function extractPassCode(data: string): string {
  const value = data.trim();
  return value.startsWith('vku://booking/') ? value.split('/').pop() || '' : value;
}

export function CheckInScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const reservations = useBookingStore((state) => state.reservations);
  const checkInReservation = useBookingStore((state) => state.checkInReservation);
  const [manualCode, setManualCode] = useState('');
  const [scanned, setScanned] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const verify = (rawCode: string) => {
    const passCode = extractPassCode(rawCode);
    const reservation = reservations.find((item) => item.passCode === passCode.toUpperCase());
    if (!reservation) {
      setMessage({ ok: false, text: 'Không tìm thấy booking tương ứng với mã này.' });
      return;
    }
    const result = checkInReservation(reservation.id, passCode);
    setMessage({ ok: result.ok, text: result.message });
  };

  return <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Quay lại"><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.kicker}>SMART CHECK-IN</Text><Text style={styles.title}>Quét mã vào phòng</Text></View>
      </View>
      <Text style={styles.subtitle}>Đưa QR booking vào khung quét. Nếu không có camera, nhập mã bên dưới.</Text>
      <View style={styles.cameraCard}>
        {permission?.granted && !message?.ok ? <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned ? undefined : ({ data }) => { setScanned(true); verify(data); }} /> : <View style={styles.cameraPlaceholder}><Ionicons name={permission?.granted ? 'checkmark-circle-outline' : 'camera-outline'} size={42} color={colors.primary} /><Text style={styles.placeholderTitle}>{permission?.granted ? 'Đã sẵn sàng xác thực' : 'Camera chưa được cấp quyền'}</Text><Text style={styles.placeholderText}>{permission?.granted ? 'Quét lại mã QR để tiếp tục.' : 'Bạn vẫn có thể nhập mã thủ công bên dưới.'}</Text></View>}
        {permission?.granted && !message?.ok ? <View style={styles.scanFrame}><View style={[styles.corner, styles.cornerTopLeft]} /><View style={[styles.corner, styles.cornerTopRight]} /><View style={[styles.corner, styles.cornerBottomLeft]} /><View style={[styles.corner, styles.cornerBottomRight]} /></View> : null}
      </View>
      {!permission?.granted ? <Pressable onPress={() => void requestPermission()} style={styles.primaryButton}><Ionicons name="camera-outline" size={19} color={colors.white} /><Text style={styles.primaryButtonText}>Cho phép camera</Text></Pressable> : null}
      <View style={styles.manualCard}><Text style={styles.sectionTitle}>Nhập mã booking</Text><View style={styles.inputRow}><Ionicons name="key-outline" size={19} color={colors.primary} /><TextInput value={manualCode} onChangeText={(value) => { setManualCode(value.toUpperCase()); setMessage(null); setScanned(false); }} placeholder="VKU-ABC123" placeholderTextColor="#94A3B8" autoCapitalize="characters" style={styles.input} /><Pressable onPress={() => verify(manualCode)} style={styles.verifyButton} accessibilityLabel="Xác thực mã booking"><Ionicons name="arrow-forward" size={19} color={colors.white} /></Pressable></View></View>
      {message ? <View style={[styles.resultCard, message.ok ? styles.successCard : styles.errorCard]}><Ionicons name={message.ok ? 'checkmark-circle' : 'alert-circle'} size={24} color={message.ok ? colors.mint : colors.danger} /><View style={styles.flexOne}><Text style={styles.resultTitle}>{message.ok ? 'Check-in thành công' : 'Chưa thể check-in'}</Text><Text style={styles.resultText}>{message.text}</Text></View></View> : null}
      <Text style={styles.note}>QR chỉ xác thực được những booking đã có trên thiết bị này hoặc đã đồng bộ qua backend/Firebase.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.skySoft }, content: { padding: 20, paddingBottom: 120 }, flexOne: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, headerCopy: { flex: 1 }, iconButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, kicker: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, title: { color: colors.ink, fontSize: 27, fontWeight: '800', marginTop: 4 }, subtitle: { color: colors.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 16 }, cameraCard: { height: 330, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.navy, marginTop: 22, ...shadow.card }, camera: { flex: 1 }, cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 35 }, placeholderTitle: { color: colors.white, fontSize: 16, fontWeight: '800', marginTop: 15, textAlign: 'center' }, placeholderText: { color: '#CFEFFF', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 }, scanFrame: { position: 'absolute', width: 205, height: 205, left: '50%', top: '50%', marginLeft: -102, marginTop: -102 }, corner: { position: 'absolute', width: 32, height: 32, borderColor: '#A7F3D0' }, cornerTopLeft: { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3 }, cornerTopRight: { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3 }, cornerBottomLeft: { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3 }, cornerBottomRight: { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3 }, primaryButton: { minHeight: 52, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 14 }, primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' }, manualCard: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginTop: 16, ...shadow.card }, sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 12 }, inputRow: { minHeight: 52, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, gap: 9 }, input: { flex: 1, minHeight: 50, color: colors.ink, fontSize: 14, fontWeight: '700' }, verifyButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginRight: 4 }, resultCard: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 17, padding: 15, marginTop: 16 }, successCard: { backgroundColor: colors.mintSoft }, errorCard: { backgroundColor: colors.dangerSoft }, resultTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, resultText: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: 3 }, note: { color: colors.inkMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 18 },
});
