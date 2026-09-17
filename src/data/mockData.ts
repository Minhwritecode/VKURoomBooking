export type Building = 'A' | 'B' | 'C' | 'V';
export type Equipment = 'Projector' | 'Whiteboard' | 'High-spec PC' | 'AC';

export type Room = {
  id: string;
  name: string;
  building: Building;
  floor: string;
  capacity: number;
  equipment: Equipment[];
  image: string;
  accent: string;
  description: string;
  status: 'available' | 'occupied';
};

export const rooms: Room[] = [
  {
    id: 'lab-a3-101',
    name: 'Lab A3-101',
    building: 'A',
    floor: 'Tầng 1',
    capacity: 20,
    equipment: ['High-spec PC', 'AC', 'Projector'],
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
    accent: '#0EA5E9',
    description: 'Phòng máy rộng, phù hợp nhóm thực hành và workshop.',
    status: 'available',
  },
  {
    id: 'library-zone-b',
    name: 'Library Zone B',
    building: 'B',
    floor: 'Tầng 2',
    capacity: 8,
    equipment: ['Whiteboard', 'AC'],
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80',
    accent: '#14B8A6',
    description: 'Góc học nhóm yên tĩnh bên cạnh khu sách tham khảo.',
    status: 'occupied',
  },
  {
    id: 'studio-c-204',
    name: 'Studio C-204',
    building: 'C',
    floor: 'Tầng 2',
    capacity: 12,
    equipment: ['Projector', 'Whiteboard', 'AC'],
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
    accent: '#8B5CF6',
    description: 'Không gian linh hoạt cho thuyết trình và học nhóm.',
    status: 'available',
  },
  {
    id: 'focus-v-303',
    name: 'Focus Room V-303',
    building: 'V',
    floor: 'Tầng 3',
    capacity: 4,
    equipment: ['Whiteboard', 'AC'],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    accent: '#F59E0B',
    description: 'Phòng nhỏ cho nhóm cần tập trung cao độ.',
    status: 'available',
  },
  {
    id: 'collab-a-202',
    name: 'Collab A-202',
    building: 'A',
    floor: 'Tầng 2',
    capacity: 10,
    equipment: ['Projector', 'Whiteboard', 'AC'],
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    accent: '#F97316',
    description: 'Bàn module dễ sắp xếp cho các buổi thảo luận.',
    status: 'occupied',
  },
  {
    id: 'maker-b-105',
    name: 'Maker Lab B-105',
    building: 'B',
    floor: 'Tầng 1',
    capacity: 16,
    equipment: ['High-spec PC', 'Projector', 'AC'],
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80&sat=-30',
    accent: '#EC4899',
    description: 'Phòng lab cho nhóm dự án và prototype công nghệ.',
    status: 'available',
  },
  ...Array.from({ length: 14 }, (_, index): Room => {
    const building = ['A', 'B', 'C', 'V'][index % 4] as Building;
    const capacity = [4, 6, 10, 12, 16, 20][index % 6];
    const equipment: Equipment[] = index % 3 === 0
      ? ['Projector', 'AC']
      : index % 3 === 1
        ? ['Whiteboard', 'AC']
        : ['High-spec PC', 'Whiteboard', 'AC'];
    return {
      id: `study-${building.toLowerCase()}-${401 + index}`,
      name: `Study Room ${building}-${401 + index}`,
      building,
      floor: `Tầng ${(index % 4) + 1}`,
      capacity,
      equipment,
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      accent: ['#0EA5E9', '#14B8A6', '#8B5CF6', '#F59E0B'][index % 4],
      description: 'Không gian học tập linh hoạt cho sinh viên VKU.',
      status: index % 5 === 0 ? 'occupied' : 'available',
    };
  }),
];

export const timeSlots = [
  { id: '07:30-09:30', label: '07:30 – 09:30', startHour: 7.5 },
  { id: '09:30-11:30', label: '09:30 – 11:30', startHour: 9.5 },
  { id: '13:00-15:00', label: '13:00 – 15:00', startHour: 13 },
  { id: '15:00-17:00', label: '15:00 – 17:00', startHour: 15 },
  { id: '17:00-19:00', label: '17:00 – 19:00', startHour: 17 },
];

export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateLabel(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
    .format(date)
    .replace(',', '');
}

export function getNextSevenDays(): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
}

export function isSeedBooked(roomId: string, date: Date, slotId: string): boolean {
  const selectedStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const offset = Math.round((selectedStart - todayStart) / 86400000);
  return (
    (roomId === 'lab-a3-101' && offset === 0 && slotId === '09:30-11:30') ||
    (roomId === 'library-zone-b' && offset === 0 && slotId === '13:00-15:00') ||
    (roomId === 'collab-a-202' && offset === 1 && slotId === '15:00-17:00') ||
    (roomId === 'studio-c-204' && offset === 2 && slotId === '07:30-09:30')
  );
}
