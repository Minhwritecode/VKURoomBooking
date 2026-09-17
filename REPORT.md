# MINI-PROJECT SHORT TECHNICAL REPORT

**Course:** Cross-Platform Mobile App Development (VKU)  
**Mini-Project Title:** Mini-Project 2: VKU Space — Real-time Study Room Booking  
**Student:** Dinh Tran Tien Minh — 23IT162  
**Submission date:** 18/09/2026  

## 1. General information & deliverables

- **GitHub repository:** https://github.com/Minhwritecode/VKURoomBooking
- **Live demo:** cập nhật sau khi Vercel deployment hoàn tất.
- **Technical report PDF:** `output/pdf/VKURoomBooking-Report.pdf`

VKU Space giải quyết nhu cầu tìm phòng học/phòng máy, xem trạng thái và đặt chỗ mà không phải kiểm tra cửa phòng thủ công. Ứng dụng chạy trên iOS, Android, web desktop và PWA trên MacBook; trải nghiệm được thiết kế local-first để các thao tác đã lưu vẫn dùng được khi mất mạng.

## 2. Feature implementation checklist

| # | Feature | Status | Evidence / implementation |
|---:|---|:---:|---|
| 1 | Room discovery | ✅ Complete | FlatList, ảnh phòng, tòa/tầng, capacity, equipment, Available/Occupied. |
| 2 | Search & filters | ✅ Complete | Search shadow + chip filters theo building, capacity và equipment; web hover/focus. |
| 3 | Time-slot conflict | ✅ Complete | 7 ngày, slot 2 giờ; booked/seed-busy disabled; Firestore transaction key chống collision. |
| 4 | Zustand global state | ✅ Complete | Session, reservations, favorites, waitlist, reviews, room overrides và sync queue. |
| 5 | Persistence/offline | ✅ Complete | AsyncStorage persist; booking tạo offline, queue tự xử lý khi online. |
| 6 | QR booking pass | ✅ Complete | Mã `VKU-XXXXXX`, QR modal, camera scanner và manual verification. |
| 7 | Check-in/no-show | ✅ Complete | `reserved → checked-in → completed`; booking quá hạn được đánh dấu `no-show` khi mở app. |
| 8 | Local reminders | ✅ Complete | Expo Notifications nhắc 15 phút trước slot; permissions được xử lý an toàn. |
| 9 | Quick Book & recommendation | ✅ Complete | CTA chính tìm slot gần nhất theo mục tiêu: quiet/group/project/high-spec PC. |
| 10 | Favorite & rebook | ✅ Complete | Lưu phòng yêu thích và thao tác đặt lại booking gần nhất. |
| 11 | Smart Schedule | ✅ Complete | Countdown, trạng thái upcoming, cảnh báo chuẩn bị, Apple Calendar/Google Calendar. |
| 12 | Waitlist | ✅ Complete | Join/leave theo slot, chống trùng, chuyển `notified` khi booking matching bị hủy. |
| 13 | Room reviews | ✅ Complete | 1–5 sao + note, chống review trùng theo user/room. |
| 14 | Share booking | ✅ Complete | Native share sheet và Web Share API fallback. |
| 15 | Admin management | ✅ Complete | Tạo/sửa/xóa/khóa phòng, đổi ảnh Firebase Storage, tên, tòa, tầng, capacity, equipment. |
| 16 | Admin analytics | ✅ Complete | Counters và progress card cho rooms, bookings, check-ins, waitlist, reviews. |
| 17 | Motion/UI system | ✅ Complete | Splash/auth morph Three.js, native GL/web canvas fallback, responsive layout, safe-area, reduce-motion fallback. |
| 18 | Docker & cloud path | ✅ Complete | Node API + Docker Compose; Firebase rooms listener, booking transaction và Storage adapter. |
| 19 | MacBook PWA | ✅ Complete | `manifest.json`, service worker shell cache, installable standalone web output. |

## 3. Architecture & data flow

```text
Expo / React Native / Expo Web
        │
        ├── Navigation: Native Stack + Bottom Tabs
        ├── UI: responsive cards, FlatList, modal, safe area, motion
        ├── Zustand + AsyncStorage
        │      ├── session / favorites
        │      ├── reservations + booking lifecycle
        │      ├── waitlist / reviews / room overrides
        │      └── syncQueue for offline-first booking
        │
        ├── Firebase adapter (optional production path)
        │      ├── Firestore rooms onSnapshot
        │      ├── booking transaction
        │      └── Storage room image upload
        │
        ├── Node REST API in Docker (local adapter)
        └── Web PWA: manifest + service-worker cache
```

### Booking flow

1. User searches or chooses a learning goal.
2. App filters the room catalog and opens the room detail screen.
3. Date/slot selector disables occupied slots immediately.
4. A reservation is created locally with a unique pass code and added to `syncQueue`.
5. Notification is scheduled for 15 minutes before start; QR pass is available offline.
6. When network returns, the queue posts to the configured API/Firebase transaction.
7. At the room, staff/user scans the QR or enters the code. The reservation becomes `checked-in`.

## 4. UX decisions and evidence

The original report supplied for the field-survey project was reused as the report structure: general information, checklist, architecture, evidence and technical challenges. The new evidence is mapped to the booking product:

```text
┌──────────────────────────────────────────────────────────────┐
│ VKU SPACE       Booking tiếp theo       Đặt nhanh             │
│ [ 🔎 Tìm phòng, tòa nhà... ]                                  │
│ [ Tất cả ] [ Tòa A ] [ 2–6 chỗ ] [ Projector ]               │
│                                                              │
│ 21 phòng phù hợp                         Trạng thái live      │
│ ┌─────────────────────┐  ┌─────────────────────┐            │
│ │ [ẢNH] Lab A3-101    │  │ [ẢNH] Studio C-204  │            │
│ │ Available · 20 chỗ  │  │ Available · 12 chỗ  │            │
│ │ AC · PC cao · Đặt   │  │ Projector · Đặt     │            │
│ └─────────────────────┘  └─────────────────────┘            │
│  Khám phá        Tập trung       Lịch đặt          Hồ sơ      │
└──────────────────────────────────────────────────────────────┘
```

- Search và filter nằm trong cùng một scroll context nên không bị cắt ở cuối màn hình.
- Room card dùng ảnh thật/remote URL, trạng thái màu và CTA rõ; desktop dùng grid, mobile dùng một cột.
- Auth/splash dùng morph motion có kiểm soát; phần browse ưu tiên tốc độ đọc và scroll 60fps.
- ADHD-friendly: một CTA chính, quick book, “đặt lại”, countdown và ít quyết định đồng thời.

## 5. Technical challenges & resolutions

### Challenge 1 — Không tạo booking trùng

Local UI khóa slot đã biết; khi có Firebase, `runTransaction` đọc document theo `roomId_dateKey_slotId` trước khi ghi. Backend demo cũng trả `409 SLOT_CONFLICT`. Như vậy UI nhanh nhưng vẫn có lớp bảo vệ ở server.

### Challenge 2 — Offline nhưng vẫn dễ hiểu

Session, catalog seed, booking, QR pass, waitlist và review được persist bằng AsyncStorage. Booking mới vào `syncQueue`; khi NetInfo báo online, app thử sync tuần tự và giữ lại item lỗi. UI vẫn hiển thị local state để người dùng không bị mất thao tác.

### Challenge 3 — QR/camera khác nhau giữa web và native

`expo-camera` được cấu hình permission và QR barcode scanner cho native. Màn hình check-in có manual code fallback để desktop, Expo Go thiếu permission hoặc camera hỏng vẫn dùng được.

### Challenge 4 — Motion không làm chậm trải nghiệm

Three.js chỉ được dùng ở splash/auth/hero và có native `expo-gl`, web canvas và fallback tĩnh. Các list/card không chạy 3D liên tục; content có safe-area bottom padding và fixed tab bar không che item cuối.

### Challenge 5 — Ảnh phòng và quản trị

Admin Room Manager giữ bản chỉnh sửa local ngay cả offline. Khi Firebase env có đủ, ảnh từ ImagePicker được upload vào Storage; nếu chưa cấu hình thì URI local vẫn giữ được cho phiên demo.

## 6. Verification and reproducibility

Đã kiểm tra bằng các lệnh:

```bash
npx tsc --noEmit
npx expo export --platform web
npx expo export --platform ios
npx expo export --platform android
node --check backend/server.js
docker compose config
git diff --check
```

Kết quả export web/iOS/Android và static checks đạt; Docker Compose parse thành công. Docker image runtime cần Docker daemon đang chạy mới có thể build/launch. Firebase là production path tùy chọn, không commit credentials.
