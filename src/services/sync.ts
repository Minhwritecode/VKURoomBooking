import type { Reservation } from '../store/useBookingStore';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export async function syncPendingReservations(
  reservations: Reservation[],
  queue: string[],
  onSynced: (reservationId: string) => void,
): Promise<number> {
  if (!apiUrl || queue.length === 0) return 0;
  let synced = 0;
  for (const reservationId of queue) {
    const reservation = reservations.find((item) => item.id === reservationId);
    if (!reservation) { onSynced(reservationId); continue; }
    try {
      const response = await fetch(`${apiUrl}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reservation),
      });
      if (response.ok || response.status === 409) {
        onSynced(reservationId);
        synced += 1;
      }
    } catch {
      return synced;
    }
  }
  return synced;
}
