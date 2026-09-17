import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleBookingReminder(input: {
  roomName: string;
  slotLabel: string;
  startAt: string;
  passCode: string;
}): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('booking-reminders', {
        name: 'Nhắc lịch đặt phòng',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const permission = await Notifications.getPermissionsAsync();
    const finalStatus = permission.status === 'granted'
      ? permission.status
      : (await Notifications.requestPermissionsAsync()).status;
    if (finalStatus !== 'granted') return false;

    const reminderDate = new Date(new Date(input.startAt).getTime() - 15 * 60 * 1000);
    if (reminderDate.getTime() <= Date.now()) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Sắp đến giờ học',
        body: `${input.roomName} · ${input.slotLabel} · Mã ${input.passCode}`,
        data: { screen: 'Bookings', passCode: input.passCode },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        ...(Platform.OS === 'android' ? { channelId: 'booking-reminders' } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}
