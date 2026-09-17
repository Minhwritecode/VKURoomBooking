import http from 'node:http';

const rooms = [
  { id: 'lab-a3-101', name: 'Lab A3-101', building: 'A', capacity: 20, status: 'available' },
  { id: 'library-zone-b', name: 'Library Zone B', building: 'B', capacity: 8, status: 'occupied' },
  { id: 'studio-c-204', name: 'Studio C-204', building: 'C', capacity: 12, status: 'available' },
  { id: 'focus-v-303', name: 'Focus Room V-303', building: 'V', capacity: 4, status: 'available' },
];
const bookings = [];
const waitlist = [];
const reviews = [];
const auditLog = [];

function send(response, status, data) {
  response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  response.end(JSON.stringify(data));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://localhost');
  if (request.method === 'OPTIONS') return send(response, 204, {});
  if (url.pathname === '/health') return send(response, 200, { ok: true, service: 'vku-space-api' });
  if (url.pathname === '/rooms' && request.method === 'GET') return send(response, 200, { rooms });
  if (url.pathname === '/bookings' && request.method === 'GET') return send(response, 200, { bookings });
  if (url.pathname === '/waitlist' && request.method === 'GET') return send(response, 200, { waitlist });
  if (url.pathname === '/reviews' && request.method === 'GET') return send(response, 200, { reviews: url.searchParams.get('roomId') ? reviews.filter((item) => item.roomId === url.searchParams.get('roomId')) : reviews });
  if (url.pathname === '/admin/audit' && request.method === 'GET') return send(response, 200, { auditLog });
  if (url.pathname === '/rooms' && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const room = { id: `room-${Date.now()}`, ...JSON.parse(body), createdAt: new Date().toISOString() };
        rooms.push(room);
        auditLog.unshift({ action: 'CREATE_ROOM', roomId: room.id, at: new Date().toISOString() });
        return send(response, 201, room);
      } catch { return send(response, 400, { error: 'INVALID_JSON' }); }
    });
    return;
  }
  if (url.pathname.startsWith('/rooms/') && ['PATCH', 'DELETE'].includes(request.method || '')) {
    const roomId = url.pathname.split('/').pop();
    const index = rooms.findIndex((room) => room.id === roomId);
    if (index < 0) return send(response, 404, { error: 'ROOM_NOT_FOUND' });
    if (request.method === 'DELETE') {
      const [removed] = rooms.splice(index, 1);
      auditLog.unshift({ action: 'DELETE_ROOM', roomId, at: new Date().toISOString() });
      return send(response, 200, removed);
    }
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        rooms[index] = { ...rooms[index], ...JSON.parse(body), updatedAt: new Date().toISOString() };
        auditLog.unshift({ action: 'UPDATE_ROOM', roomId, at: new Date().toISOString() });
        return send(response, 200, rooms[index]);
      } catch { return send(response, 400, { error: 'INVALID_JSON' }); }
    });
    return;
  }
  if (url.pathname === '/bookings' && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const booking = { id: `booking-${Date.now()}`, ...JSON.parse(body), createdAt: new Date().toISOString() };
        const conflict = bookings.some((item) => item.roomId === booking.roomId && item.dateKey === booking.dateKey && item.slotId === booking.slotId);
        if (conflict) return send(response, 409, { error: 'SLOT_CONFLICT', message: 'This time slot is already booked.' });
        bookings.push(booking);
        return send(response, 201, booking);
      } catch { return send(response, 400, { error: 'INVALID_JSON' }); }
    });
    return;
  }
  if (url.pathname === '/waitlist' && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const input = JSON.parse(body);
        const duplicate = waitlist.find((item) => item.roomId === input.roomId && item.dateKey === input.dateKey && item.slotId === input.slotId && item.status === 'waiting');
        if (duplicate) return send(response, 200, duplicate);
        const entry = { id: `wait-${Date.now()}`, ...input, status: 'waiting', createdAt: new Date().toISOString() };
        waitlist.push(entry);
        return send(response, 201, entry);
      } catch { return send(response, 400, { error: 'INVALID_JSON' }); }
    });
    return;
  }
  if (url.pathname.startsWith('/waitlist/') && request.method === 'DELETE') {
    const entryId = url.pathname.split('/').pop();
    const index = waitlist.findIndex((item) => item.id === entryId);
    if (index < 0) return send(response, 404, { error: 'WAITLIST_NOT_FOUND' });
    const [removed] = waitlist.splice(index, 1);
    return send(response, 200, removed);
  }
  if (url.pathname === '/reviews' && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const input = JSON.parse(body);
        const duplicate = reviews.find((item) => item.roomId === input.roomId && item.authorName === input.authorName);
        if (duplicate) return send(response, 200, duplicate);
        const review = { id: `review-${Date.now()}`, ...input, createdAt: new Date().toISOString() };
        reviews.unshift(review);
        return send(response, 201, review);
      } catch { return send(response, 400, { error: 'INVALID_JSON' }); }
    });
    return;
  }
  if (url.pathname === '/check-in' && request.method === 'POST') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try {
        const { passCode } = JSON.parse(body);
        const booking = bookings.find((item) => item.passCode === String(passCode || '').toUpperCase());
        if (!booking) return send(response, 404, { error: 'BOOKING_NOT_FOUND' });
        if (booking.status === 'checked-in') return send(response, 409, { error: 'ALREADY_CHECKED_IN' });
        booking.status = 'checked-in';
        booking.checkInAt = new Date().toISOString();
        return send(response, 200, booking);
      } catch { return send(response, 400, { error: 'INVALID_JSON' }); }
    });
    return;
  }
  return send(response, 404, { error: 'NOT_FOUND' });
});

server.listen(process.env.PORT || 4000, () => console.log('VKU Space API listening on port 4000'));
