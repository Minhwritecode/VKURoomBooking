from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf/VKURoomBooking-Report.pdf"
FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
pdfmetrics.registerFont(TTFont("ArialUnicode", FONT))

PAGE_W, PAGE_H = A4
BLUE = colors.HexColor("#0284C7")
NAVY = colors.HexColor("#0B2A4A")
INK = colors.HexColor("#172B4D")
MUTED = colors.HexColor("#60738D")
PALE = colors.HexColor("#F0F9FF")
MINT = colors.HexColor("#DFF8ED")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", fontName="ArialUnicode", fontSize=23, leading=29, textColor=NAVY, alignment=TA_CENTER, spaceAfter=7))
styles.add(ParagraphStyle(name="SubTitle", fontName="ArialUnicode", fontSize=11, leading=16, textColor=BLUE, alignment=TA_CENTER, spaceAfter=15))
styles.add(ParagraphStyle(name="H1Custom", fontName="ArialUnicode", fontSize=15, leading=19, textColor=NAVY, spaceBefore=3, spaceAfter=8))
styles.add(ParagraphStyle(name="H2Custom", fontName="ArialUnicode", fontSize=10.5, leading=14, textColor=NAVY, spaceBefore=5, spaceAfter=4))
styles.add(ParagraphStyle(name="BodyCustom", fontName="ArialUnicode", fontSize=8.4, leading=12, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle(name="SmallCustom", fontName="ArialUnicode", fontSize=7.2, leading=9.4, textColor=INK))
styles.add(ParagraphStyle(name="TinyCustom", fontName="ArialUnicode", fontSize=6.2, leading=7.7, textColor=INK))
styles.add(ParagraphStyle(name="CodeCustom", fontName="ArialUnicode", fontSize=6.7, leading=8.7, textColor=INK, backColor=PALE, borderPadding=6, spaceAfter=7))


def P(text, style="BodyCustom"):
    return Paragraph(text, styles[style])


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BLUE)
    canvas.rect(0, PAGE_H - 5 * mm, PAGE_W, 5 * mm, stroke=0, fill=1)
    canvas.setFont("ArialUnicode", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 10 * mm, "VKU Space · Mini-Project 2")
    canvas.drawRightString(PAGE_W - 18 * mm, 10 * mm, f"Trang {doc.page}")
    canvas.restoreState()


def checklist(rows):
    data = [[P("#", "TinyCustom"), P("Feature", "TinyCustom"), P("Status", "TinyCustom"), P("Implementation / evidence", "TinyCustom")]]
    data.extend([[P(str(n), "TinyCustom"), P(feature, "TinyCustom"), P("✅ Complete", "TinyCustom"), P(detail, "TinyCustom")] for n, feature, detail in rows])
    table = Table(data, colWidths=[8 * mm, 39 * mm, 22 * mm, 112 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D7E5F0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table


class ReportDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=15 * mm, bottomMargin=17 * mm, title="VKU Space Technical Report", author="Dinh Tran Tien Minh")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates([PageTemplate(id="all", frames=frame, onPage=header_footer)])


rows = [
    (1, "Room discovery", "FlatList, ảnh phòng, tòa/tầng, capacity, equipment và trạng thái.") ,
    (2, "Search & filters", "Search shadow + chip filter theo building, capacity, equipment; hover/focus web."),
    (3, "Time-slot conflict", "7 ngày, slot 2 giờ; booked/seed-busy disabled; transaction key chống collision."),
    (4, "Zustand global state", "Session, reservations, favorites, waitlist, reviews, overrides và sync queue."),
    (5, "Persistence/offline", "AsyncStorage persist; booking tạo offline, queue tự sync khi online."),
    (6, "QR booking pass", "Mã VKU-XXXXXX, QR modal, camera scanner và manual verification."),
    (7, "Check-in/no-show", "reserved → checked-in → completed; quá hạn đánh dấu no-show khi mở app."),
    (8, "Local reminders", "Expo Notifications nhắc 15 phút trước slot; permission an toàn."),
    (9, "Quick Book", "Tìm slot gần nhất theo quiet/group/project/high-spec PC."),
    (10, "Favorite & rebook", "Lưu phòng yêu thích và đặt lại booking gần nhất."),
    (11, "Smart Schedule", "Countdown, cảnh báo chuẩn bị, Apple Calendar/Google Calendar."),
    (12, "Waitlist", "Join/leave theo slot, chống trùng, báo slot mở khi booking matching hủy."),
    (13, "Room reviews", "1–5 sao + note, chống review trùng theo user/room."),
    (14, "Share booking", "Native share sheet và Web Share API fallback."),
    (15, "Admin management", "Tạo/sửa/xóa/khóa, đổi ảnh, tên, tòa, tầng, capacity, equipment."),
    (16, "Admin analytics", "Counters/progress cho rooms, bookings, check-ins, waitlist, reviews."),
    (17, "Motion/UI system", "Morph Three.js native/web fallback, responsive, safe-area, reduce motion."),
    (18, "Docker & Firebase", "Node API + Compose; rooms listener, booking transaction, Storage adapter."),
    (19, "MacBook PWA", "Manifest + service worker shell cache, standalone web output."),
]

story = [
    Spacer(1, 18 * mm),
    P("MINI-PROJECT 2", "SubTitle"),
    P("VKU SPACE", "CoverTitle"),
    P("REAL-TIME STUDY ROOM BOOKING", "CoverTitle"),
    P("Short Technical Report · Cross-Platform Mobile App Development", "SubTitle"),
    Table([[P("Student", "SmallCustom"), P("Dinh Tran Tien Minh · 23IT162", "SmallCustom")], [P("Date", "SmallCustom"), P("18/09/2026", "SmallCustom")], [P("Repository", "SmallCustom"), P("github.com/Minhwritecode/VKURoomBooking", "SmallCustom")], [P("Live demo", "SmallCustom"), P("vku-room-booking-kappa.vercel.app", "SmallCustom")]], colWidths=[33 * mm, 130 * mm], style=TableStyle([("BACKGROUND", (0, 0), (0, -1), PALE), ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#D7E5F0")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)])),
    Spacer(1, 10 * mm),
    P("VKU Space giúp sinh viên tìm phòng học/phòng máy, xem trạng thái và đặt chỗ mà không phải kiểm tra cửa phòng thủ công. Ứng dụng chạy trên iOS, Android, web desktop và PWA trên MacBook; local-first để booking đã lưu vẫn dùng được khi mất mạng.", "BodyCustom"),
    P("1. FEATURE IMPLEMENTATION CHECKLIST", "H1Custom"),
    checklist(rows[:10]),
    PageBreak(),
    P("1. FEATURE IMPLEMENTATION CHECKLIST (CONT.)", "H1Custom"),
    checklist(rows[10:]),
    P("2. ARCHITECTURE & DATA FLOW", "H1Custom"),
    P("Expo / React Native / Expo Web → Native Stack + Bottom Tabs → responsive UI → Zustand + AsyncStorage → Firebase adapter (optional) / Node REST API in Docker → PWA manifest + service-worker cache.", "CodeCustom"),
    P("Booking flow", "H2Custom"),
    P("1) Người dùng tìm phòng hoặc chọn learning goal. 2) Date/slot selector khóa slot đã bận. 3) Reservation được tạo local với pass code và đưa vào syncQueue. 4) Notification được hẹn 15 phút trước giờ bắt đầu. 5) QR/manual code xác thực check-in. 6) Khi online, queue sync qua API hoặc Firestore transaction.", "BodyCustom"),
    P("State được persist gồm session, reservations, favorites, waitlist, reviews, room overrides và queue. Firebase listener nhận rooms realtime; Storage upload ảnh phòng khi Admin cấu hình env.", "BodyCustom"),
    PageBreak(),
    P("3. UX DECISIONS & EVIDENCE", "H1Custom"),
    P("┌──────────────────────────────────────────────────────────┐<br/>│ VKU SPACE · Booking tiếp theo · Đặt nhanh                 │<br/>│ [ 🔎 Tìm phòng, tòa nhà... ]                               │<br/>│ [Tất cả] [Tòa A] [2–6 chỗ] [Projector]                    │<br/>│ 21 phòng phù hợp                         Trạng thái live   │<br/>│ [ẢNH] Lab A3-101 · Available · 20 chỗ · Đặt               │<br/>│ [ẢNH] Studio C-204 · Available · 12 chỗ · Đặt             │<br/>│ Khám phá · Tập trung · Lịch đặt · Hồ sơ                    │<br/>└──────────────────────────────────────────────────────────┘", "CodeCustom"),
    P("Search và filter nằm trong cùng scroll context để không bị cắt; desktop dùng max-width/grid 2 cột, mobile về một cột. Search box có shadow và button/chip có hover/focus feedback. Morph Three.js chỉ dùng ở splash/auth/hero/modal, không chạy 3D liên tục trong FlatList. ADHD-friendly bằng một CTA chính, Quick Book, “đặt lại”, countdown và ít quyết định đồng thời.", "BodyCustom"),
    P("4. TECHNICAL CHALLENGES & RESOLUTIONS", "H1Custom"),
    P("Conflict prevention: UI khóa slot đã biết; Firebase runTransaction dùng key roomId_dateKey_slotId; backend trả 409 nếu trùng. Offline: AsyncStorage giữ dữ liệu và syncQueue thử sync tuần tự khi NetInfo báo online. QR: expo-camera hỗ trợ native, manual code fallback cho desktop/permission failure. Motion: native expo-gl, web canvas và fallback tĩnh giúp trải nghiệm mượt hơn. Admin: local override hoạt động offline, Firebase Storage nhận ảnh khi có cấu hình.", "BodyCustom"),
    P("5. VERIFICATION & REPRODUCIBILITY", "H1Custom"),
    P("Đã chạy thành công: npx tsc --noEmit; expo export --platform web/ios/android; node --check backend/server.js; docker compose config; git diff --check. Docker image runtime cần Docker daemon đang chạy. Firebase là production path tùy chọn; không commit credentials.", "BodyCustom"),
    P("Cài đặt: npm install → npx expo start (Expo Go) hoặc npx expo start --web (MacBook/PWA). Development build được khuyến nghị cho camera QR, notification, Calendar và native Three.js.", "BodyCustom"),
]

OUT.parent.mkdir(parents=True, exist_ok=True)
ReportDoc(str(OUT)).build(story)
print(OUT)
