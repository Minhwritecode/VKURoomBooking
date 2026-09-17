import * as Calendar from 'expo-calendar';
import { Linking, Platform } from 'react-native';

type CalendarBooking = {
  roomName: string;
  dateLabel: string;
  slotLabel: string;
  startAt: string;
};

export async function addBookingToCalendar(booking: CalendarBooking): Promise<boolean> {
  const startDate = new Date(booking.startAt);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  if (Platform.OS === 'web') {
    const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`VKU · ${booking.roomName}`)}&dates=${format(startDate)}/${format(endDate)}&details=${encodeURIComponent(`${booking.dateLabel} · ${booking.slotLabel}`)}`;
    await Linking.openURL(url);
    return true;
  }

  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (permission.status !== 'granted') return false;
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((item) => item.allowsModifications) || calendars[0];
  if (!writable) return false;
  await Calendar.createEventAsync(writable.id, {
    title: `VKU · ${booking.roomName}`,
    startDate,
    endDate,
    notes: `${booking.dateLabel} · ${booking.slotLabel}`,
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  return true;
}
