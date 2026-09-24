# VKU Space - Real-time Study Room Booking

Ứng dụng mobile React Native + Expo SDK 57 cho sinh viên VKU tìm và đặt phòng học.

## Phạm vi production

- Browse Rooms: `FlatList` tối ưu, ảnh phòng, tòa nhà/tầng, sức chứa, thiết bị và trạng thái.
- Bộ lọc tức thì theo từ khóa, tòa A/B/C/V, sức chứa 2-20 chỗ và thiết bị.
- Chọn 7 ngày + slot 2 giờ; slot seed-booked và slot đã đặt được disable ngay trên UI.
- Booking pass có QR check-in, mã duy nhất và thao tác hủy lượt đặt.
- Quick Book tự tìm phòng/slot trống gần nhất theo mục tiêu: yên tĩnh, học nhóm, project hoặc PC cao.
- Smart Schedule có countdown, cảnh báo chuẩn bị và thêm booking vào lịch hệ thống; web mở Google Calendar.
- Firebase Authentication quản lý tài khoản email/mật khẩu, reset password, xác minh email và session persistence trên mobile.
- Firestore lưu profile, booking, waitlist và review theo `uid`; transaction chống hai người đặt cùng một room/date/slot.
- Firebase Storage lưu ảnh phòng; Security Rules giới hạn dữ liệu cá nhân và chỉ admin mới được quản trị catalog.
- Zustand + AsyncStorage là cache/offline queue, không phải nguồn quyền hạn; khi có mạng dữ liệu được reconcile với Firebase.
- Local notification nhắc trước 15 phút (permission được xử lý an toàn).
- Splash → auth → home có Three.js morph 3D qua `expo-gl`, kèm fallback native nếu thiết bị không hỗ trợ GL; form auth có morph blobs và transition mượt.
- Navigation tối ưu theo flow: Native Stack cho chi tiết/chỉnh sửa và Bottom Tabs 4 mục có chủ đích, icon + label, safe area, touch target rõ ràng.
- Focus Mode: phiên 25/50/90 phút, break tự động 5/10 phút, timer lớn, pause/resume/reset, mục tiêu duy nhất và ambient sound tùy chọn.
- Admin Room Manager: tạo, đổi tên, ảnh từ thư viện, tòa nhà, tầng, sức chứa, mô tả, thiết bị, khóa/mở và xóa phòng; thay đổi được lưu local ngay cả khi offline.
- Responsive cho mobile, tablet và web; hero/card giới hạn chiều rộng trên màn hình lớn để giữ nhịp đọc tốt.
- Offline state: phòng seed và booking đã lưu vẫn dùng được khi mất mạng.
- Docker API mẫu tại `backend/` để mở rộng sync/Firebase sau này.

## Chạy app

```bash
npm install
npx expo start
```

Có thể mở bằng Expo Go hoặc development build SDK 57. Local notification vẫn dùng được trong Expo Go; push notification remote cần development build theo tài liệu Expo.

## Chạy API Docker tùy chọn

```bash
docker compose up --build
```

API mẫu:

- `GET http://localhost:4000/health`
- `GET http://localhost:4000/rooms`
- `GET http://localhost:4000/bookings`
- `POST http://localhost:4000/bookings`
- `POST/PATCH/DELETE http://localhost:4000/rooms` và `/rooms/:id`
- `GET http://localhost:4000/admin/audit`

App vẫn không phụ thuộc API để browse/đặt phòng demo. Đây là chủ ý offline-first; chỉ cần thêm `EXPO_PUBLIC_API_URL` và sync adapter khi triển khai backend thật.

## Bật Firebase production

### Mô hình quyền production

VKU Space tách rõ **identity** (người dùng đã đăng nhập) và **authorization** (quyền được cấp). Màn hình hồ sơ hiển thị badge `USER` hoặc `ADMIN`; `PREVIEW` chỉ là chế độ kiểm thử giao diện local, không phải quyền thật.

- **User:** tìm/đặt phòng, hủy booking của mình, check-in, waitlist và đánh giá.
- **Admin:** mọi quyền của user, cộng thêm tạo/sửa/xóa/khóa phòng, đổi ảnh và xem analytics.
- **Không tự nâng quyền:** client không được tự ghi `role: admin`. Firestore Rules vẫn là lớp chặn cuối cùng.
- **Quy mô lớn:** khi triển khai quản trị nhiều tài khoản, dùng backend/Cloud Functions với Firebase Admin SDK để cấp custom claims; màn hình admin chỉ gọi endpoint đã xác thực, không ghi role trực tiếp từ client. Sau khi đổi quyền, buộc refresh ID token/đăng nhập lại.

Role preview trong app chỉ nhằm giúp kiểm thử User/Admin trên local khi chưa bật Firebase. Khi Firebase bật, app đọc role production từ hồ sơ và khóa công tắc này.

1. Tạo Firebase project và thêm một **Web app** trong Firebase Console.
2. Bật **Authentication → Email/Password**, tạo Firestore Database và Storage.
3. Copy các biến trong `.env.example` sang `.env.local` (không commit file này).
4. Deploy rule/index production:

```bash
npx firebase login
npx firebase use <your-project-id>
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

5. Đăng ký user đầu tiên, sau đó trong Firebase Console đổi `users/<uid>.role` thành `admin` để cấp quyền quản trị. Client không thể tự nâng quyền.
6. Trên Vercel, thêm cùng các `EXPO_PUBLIC_FIREBASE_*` variables cho **Production**, rồi redeploy.

Các collection production chính: `users`, `rooms`, `bookings`, `waitlist`, `reviews`. Booking dùng key bất biến `roomId_dateKey_slotId`; Firestore transaction là lớp quyết định cuối cùng khi có xung đột.

## Kiến trúc

```text
App.tsx
  ├── Auth flow (login/register + morph motion)
  ├── Root Stack (tabs + room detail)
  ├── Focus Mode (timer 25/50/90 + single-task goal)
  ├── Browse (FlatList + filters)
  ├── Booking flow (date/slot conflict + QR modal)
  ├── Zustand store (session + reservations + persistence)
  └── Notification service (local 15-minute reminder)
```

## Kiểm tra

```bash
npx tsc --noEmit
npx expo export --platform web
```

Để kiểm tra offline: mở app một lần khi đã đăng nhập, tải catalog và đặt booking; sau đó tắt mạng. Cache, QR pass và queue vẫn còn trên máy, sẽ tự đồng bộ khi kết nối trở lại. Nếu booking offline trùng slot đã được người khác giữ, transaction online từ chối bản ghi và queue được gỡ để không retry vô hạn.

## Feature pack hoàn chỉnh

- **QR check-in thật:** quét bằng `expo-camera` hoặc nhập `VKU-XXXXXX`; booking có lifecycle `reserved`, `checked-in`, `completed`, `no-show`.
- **Waitlist:** chọn phòng/ngày/slot, chống tham gia trùng; khi booking bị hủy, người đang chờ nhận trạng thái slot đã mở.
- **Room review:** đánh giá 1–5 sao và ghi chú, chống đánh giá trùng theo phòng/người dùng.
- **Share booking:** native share sheet trên iOS/Android và Web Share API trên web.
- **Admin analytics:** tổng phòng, phòng đang khóa, booking, check-in, waitlist và review; chỉ tài khoản có `role: admin` mới có thể tạo/sửa ảnh/tên/sức chứa/thiết bị, khóa/mở và xóa phòng khi Firebase bật.
- **Smart recommendation:** chọn mục tiêu học tập để app ưu tiên phòng phù hợp, kết hợp Quick Book và đặt lại booking gần nhất.
- **PWA MacBook:** `public/manifest.json`, `public/sw.js`, responsive desktop layout, shadow/hover/focus feedback và offline shell cache.

## Chạy trên MacBook và điện thoại

```bash
npm install
npx expo start --web        # web/PWA trên MacBook
npx expo start              # QR cho Expo Go trên iPhone/Android
npx expo start --tunnel     # khi điện thoại khác Wi-Fi
```

Chrome hỗ trợ **Install VKU Space**; Safari macOS có thể chọn **File → Add to Dock** sau khi deployment có HTTPS. Với QR camera, local notification, Calendar và Three.js native, nên dùng development build:

```bash
npx expo run:ios
npx expo run:android
```

## API và triển khai

Docker API demo có thêm các endpoint: `GET/POST /waitlist`, `DELETE /waitlist/:id`, `GET/POST /reviews`, `POST /check-in`, cùng room CRUD, booking collision và `/admin/audit`. API in-memory chỉ là fallback/dev; production dùng Firebase/Firestore có Authentication và Security Rules.

Vercel dùng cấu hình trong `vercel.json`:

Live demo: https://vku-room-booking-kappa.vercel.app

```bash
npx expo export --platform web
npx vercel --prod
```

`dist/` không được commit; Vercel sẽ build trực tiếp từ source. Firebase config dùng các biến `EXPO_PUBLIC_FIREBASE_*` trong `.env.local`/Vercel Environment Variables; không commit file env hoặc service-account key.

## Kiểm tra trước khi nộp

```bash
npx tsc --noEmit
npx expo export --platform web
npx expo export --platform ios
npx expo export --platform android
node --check backend/server.js
docker compose config
git diff --check
```

Technical report theo cấu trúc report cũ nằm ở [`REPORT.md`](./REPORT.md); bản PDF nằm trong `output/pdf/`.
