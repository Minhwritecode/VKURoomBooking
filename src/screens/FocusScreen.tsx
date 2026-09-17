import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadow } from '../theme';

const presets = [25, 50, 90] as const;
const AMBIENT_URL = 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg';

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function FocusScreen() {
  const [preset, setPreset] = useState<(typeof presets)[number]>(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'focus' | 'break'>('focus');
  const [breakMinutes, setBreakMinutes] = useState<5 | 10>(5);
  const [ambient, setAmbient] = useState(false);
  const [goal, setGoal] = useState('Hoàn thành một việc quan trọng');
  const ambientPlayer = useAudioPlayer(null);

  useEffect(() => {
    if (!ambient) {
      ambientPlayer.pause();
      return;
    }
    ambientPlayer.replace(AMBIENT_URL);
    ambientPlayer.loop = true;
    ambientPlayer.volume = 0.16;
    ambientPlayer.play();
  }, [ambient, ambientPlayer]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          if (phase === 'focus') {
            setPhase('break');
            Alert.alert('Phiên tập trung hoàn tất', 'Nghỉ ngắn 5 phút rồi quay lại nhé.');
            return breakMinutes * 60;
          }
          setPhase('focus');
          setRunning(false);
          Alert.alert('Hết giờ nghỉ', 'Sẵn sàng cho một phiên mới chưa?');
          return preset * 60;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [breakMinutes, phase, preset, running]);

  const progress = useMemo(() => 1 - secondsLeft / (preset * 60), [preset, secondsLeft]);
  const selectPreset = (value: (typeof presets)[number]) => {
    setPreset(value);
    setSecondsLeft(value * 60);
    setPhase('focus');
    setRunning(false);
  };
  const reset = () => {
    setSecondsLeft((phase === 'focus' ? preset : breakMinutes) * 60);
    setRunning(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>FOCUS MODE</Text>
        <Text style={styles.title}>Một việc thôi.</Text>
        <Text style={styles.subtitle}>Giảm nhiễu, chọn thời lượng, bắt đầu nhẹ nhàng.</Text>

        <View style={styles.timerCard}>
          <View style={styles.timerRing}>
            <View style={[styles.progressArc, { transform: [{ rotate: `${-45 + progress * 270}deg` }] }]} />
            <View style={styles.timerCore}>
              <Ionicons name={running ? 'flash' : 'moon-outline'} size={20} color={colors.primary} />
              <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>
              <Text style={styles.timerLabel}>{phase === 'break' ? 'giờ nghỉ' : running ? 'đang tập trung' : 'sẵn sàng'}</Text>
            </View>
          </View>

          <View style={styles.presetRow}>
            {presets.map((value) => (
              <Pressable key={value} onPress={() => selectPreset(value)} style={[styles.preset, preset === value && styles.presetActive]} accessibilityRole="button" accessibilityState={{ selected: preset === value }}>
                <Text style={[styles.presetText, preset === value && styles.presetTextActive]}>{value} phút</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>Nghỉ sau phiên</Text>
            {[5, 10].map((value) => <Pressable key={value} onPress={() => { setBreakMinutes(value as 5 | 10); if (phase === 'break') setSecondsLeft(value * 60); }} style={[styles.breakChip, breakMinutes === value && styles.breakChipActive]}><Text style={[styles.breakText, breakMinutes === value && styles.breakTextActive]}>{value} phút</Text></Pressable>)}
            <Pressable onPress={() => setAmbient((value) => !value)} style={[styles.ambientChip, ambient && styles.ambientChipActive]} accessibilityRole="switch" accessibilityState={{ checked: ambient }}><Ionicons name="volume-medium-outline" size={15} color={ambient ? colors.white : colors.inkMuted} /><Text style={[styles.breakText, ambient && styles.breakTextActive]}>Ambient {ambient ? 'bật' : 'tắt'}</Text></Pressable>
          </View>

          <View style={styles.goalCard}>
            <View style={styles.goalIcon}><Ionicons name="flag-outline" size={19} color={colors.primary} /></View>
            <View style={styles.goalCopy}>
              <Text style={styles.goalLabel}>MỤC TIÊU PHIÊN NÀY</Text>
              <Text style={styles.goalText}>{goal}</Text>
            </View>
            <Pressable onPress={() => { setGoal(goal === 'Hoàn thành một việc quan trọng' ? 'Đọc và ghi chú 5 trang' : 'Hoàn thành một việc quan trọng'); }} hitSlop={8} accessibilityLabel="Đổi mục tiêu"><Ionicons name="refresh-outline" size={18} color={colors.inkMuted} /></Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={() => setRunning((value) => !value)} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]} accessibilityRole="button">
              <Ionicons name={running ? 'pause' : 'play'} size={18} color={colors.white} />
              <Text style={styles.primaryActionText}>{running ? 'Tạm dừng' : 'Bắt đầu'}</Text>
            </Pressable>
            <Pressable onPress={reset} style={({ pressed }) => [styles.resetAction, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Đặt lại bộ đếm">
              <Ionicons name="refresh-outline" size={19} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}><Ionicons name="bulb-outline" size={19} color={colors.mint} /></View>
          <View style={styles.goalCopy}><Text style={styles.tipTitle}>Mẹo cho não đang bận</Text><Text style={styles.tipText}>Đặt điện thoại úp xuống và chỉ mở một tab cần thiết trong phiên này.</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.skySoft },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  kicker: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: '800', marginTop: 5 },
  subtitle: { color: colors.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 20 },
  timerCard: { backgroundColor: colors.white, borderRadius: 26, padding: 20, alignItems: 'center', ...shadow.card },
  timerRing: { width: 228, height: 228, borderRadius: 114, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center', borderWidth: 11, borderColor: '#D6F3FC' },
  progressArc: { position: 'absolute', width: 228, height: 228, borderRadius: 114, borderWidth: 11, borderColor: colors.primary, borderRightColor: 'transparent', borderBottomColor: 'transparent' },
  timerCore: { width: 174, height: 174, borderRadius: 87, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  timer: { color: colors.ink, fontSize: 43, fontWeight: '800', letterSpacing: 1 },
  timerLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '800', marginTop: 4 },
  presetRow: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 20 },
  preset: { flex: 1, minHeight: 42, borderRadius: 13, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  presetActive: { backgroundColor: colors.ink },
  presetText: { color: colors.inkMuted, fontSize: 12, fontWeight: '800' },
  presetTextActive: { color: colors.white },
  breakRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, width: '100%', marginTop: 14 },
  breakLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '800', marginRight: 2 },
  breakChip: { minHeight: 30, paddingHorizontal: 9, borderRadius: 999, backgroundColor: colors.surfaceMuted, justifyContent: 'center' },
  breakChipActive: { backgroundColor: colors.sky },
  breakText: { color: colors.inkMuted, fontSize: 10, fontWeight: '800' },
  breakTextActive: { color: colors.primaryDark },
  ambientChip: { minHeight: 30, paddingHorizontal: 9, borderRadius: 999, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', gap: 4 },
  ambientChipActive: { backgroundColor: colors.primary },
  goalCard: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: colors.surfaceMuted, borderRadius: 16, padding: 12, marginTop: 18, gap: 10 },
  goalIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sky },
  goalCopy: { flex: 1 },
  goalLabel: { color: colors.inkMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  goalText: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 4 },
  actions: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 16 },
  primaryAction: { flex: 1, minHeight: 53, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryActionText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  resetAction: { width: 53, minHeight: 53, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.mintSoft, borderRadius: 17, padding: 15, marginTop: 18 },
  tipIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { color: '#047857', fontSize: 13, fontWeight: '800' },
  tipText: { color: '#047857', fontSize: 11, lineHeight: 16, marginTop: 3 },
});
