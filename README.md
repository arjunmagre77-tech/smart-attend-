# SmartAttend — Smart RFID Attendance Management System

A full-stack, production-ready school attendance management web application that integrates with an **ESP32 + MFRC522 RFID reader** (programmed separately in Arduino IDE). Built with Next.js 16, TypeScript, Tailwind CSS, and Firebase.

---

## Features

- **Real-time RFID attendance** via a secure REST API endpoint
- **Dashboard** with live statistics and charts (weekly trends, class comparison, daily distribution)
- **Student management** with RFID card assignment and parent contact information
- **Attendance records** with date/class/status filtering and CSV export
- **Parent notifications** via WhatsApp Business, SMS (Twilio), or email — with a development simulator
- **Reports** with date-range filtering, daily trend charts, and per-student attendance percentages
- **Device management** — register and authorize ESP32 devices with hashed secrets
- **Role-based access control** — Admin and Teacher roles enforced server-side
- **Demo mode** — works fully out-of-the-box without Firebase, using realistic seed data
- **Idempotent scan API** — safe to retry; duplicate scans never create duplicate records

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI primitives + custom design system |
| Icons | Lucide React |
| Charts | Recharts |
| Database | Firebase Firestore |
| Authentication | Firebase Auth |
| Server API | Next.js Route Handlers |
| Validation | Zod |
| Notifications | WhatsApp / Twilio SMS / Email (simulator default) |
| Deployment | Vercel |

---

## Getting Started

### 1. Clone and Install

```bash
cd smart-attend
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values. If Firebase credentials are omitted, the app runs in **Demo Mode** automatically.

### 3. Run in Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In demo mode, you are signed in automatically as a demo administrator.

---

## Firebase Setup

### Step 1 — Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Firestore Database** (production mode)
4. Enable **Authentication** → Sign-in method → Email/Password

### Step 2 — Client Configuration

In Firebase Console → Project Settings → General → Your apps → Web app:

Copy the `firebaseConfig` values into your `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Step 3 — Admin SDK (Server-side)

In Firebase Console → Project Settings → Service accounts → Generate new private key:

```
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **Vercel note:** Paste the private key with literal `\n` in the environment variable field — do not use actual newlines.

### Step 4 — Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` into Firebase Console → Firestore → Rules.

### Step 5 — Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

Or create the indexes listed in `firestore.indexes.json` via Firebase Console.

### Step 6 — Create the First Admin User

1. Go to Firebase Console → Authentication → Add user
2. In your browser, sign in with that email/password
3. In Firestore Console, manually create a document at `users/{uid}`:

```json
{
  "userId": "REPLACE_WITH_FIREBASE_UID",
  "email": "admin@yourschool.edu",
  "displayName": "School Administrator",
  "role": "admin",
  "isActive": true,
  "createdAt": "2026-10-14T00:00:00.000Z"
}
```

---

## ESP32 Integration

The hardware (ESP32 + MFRC522) is programmed separately in Arduino IDE.

### Endpoint

```
POST /api/attendance/scan
```

### Required Headers

```
Content-Type: application/json
X-Device-ID: school-gate-01
X-Device-Secret: <device-secret-configured-in-settings>
```

### Request Body

```json
{
  "rfidUid": "A31F2B09",
  "deviceId": "school-gate-01",
  "eventId": "unique-scan-event-id-per-tap"
}
```

> The `eventId` must be unique per physical card tap. Use a combination of device uptime milliseconds + a counter, or a UUID generated on the ESP32.

### Responses

| HTTP Status | Meaning |
|-------------|---------|
| 201 | Attendance recorded successfully |
| 200 | Already recorded today (duplicate tap — safe to ignore) |
| 400 | Invalid request body / missing fields |
| 401 | Missing or invalid device credentials |
| 403 | Device is registered but inactive |
| 404 | RFID UID not registered to any student |
| 409 | Student account is inactive |
| 429 | Rate limit exceeded (max 10 scans/min per device) |
| 500 | Database failure — retry after brief delay |

### Success Response (201)

```json
{
  "success": true,
  "message": "Attendance recorded",
  "student": {
    "studentId": "STU001",
    "name": "Aryan Mehta"
  },
  "attendance": {
    "date": "2026-10-14",
    "status": "present"
  }
}
```

### Security Notes for Hardware Developer

1. **Store the device secret in firmware flash**, not in code committed to version control.
2. **Use HTTPS only** — never send the device secret over plain HTTP.
3. **The server resolves the student from the RFID UID** — never trust student data from the device.
4. **Implement retry logic** for 500 responses with exponential backoff (max 3 retries).
5. **For 200 responses**, no action is needed — the student already checked in today.

### Arduino IDE Template

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

const char* SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "https://your-domain.vercel.app/api/attendance/scan";
const char* DEVICE_ID = "school-gate-01";
const char* DEVICE_SECRET = "your-device-secret-here";

// ... MFRC522 setup ...

void scanCard(String rfidUid) {
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-ID", DEVICE_ID);
  http.addHeader("X-Device-Secret", DEVICE_SECRET);

  String eventId = String(DEVICE_ID) + "_" + String(millis());
  String body = "{\"rfidUid\":\"" + rfidUid + "\",\"deviceId\":\"" + DEVICE_ID + "\",\"eventId\":\"" + eventId + "\"}";

  int httpCode = http.POST(body);
  // Handle response codes as per table above
  http.end();
}
```

---

## Parent Notifications

### Configuration

Set `NOTIFICATION_CHANNEL` in `.env.local`:

| Value | Provider | Required Variables |
|-------|---------|-------------------|
| `simulator` | Development only — logs to console | None |
| `whatsapp` | WhatsApp Business API (Meta) | `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| `sms` | Twilio SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| `email` | Custom (implement in provider.ts) | `EMAIL_API_KEY`, `EMAIL_FROM_ADDRESS` |

### Message Format

```
Attendance Update: Your child [Student Name] checked in at [HH:MM AM/PM] on [DD Mon YYYY].
```

Demo notifications are prefixed with `[DEMO]`.

### Guarantee

- Notifications are sent **after** the attendance record is committed.
- They do not block the scan API response.
- If a notification fails, the attendance record is not affected.
- Duplicate scans (same student, same day) never trigger duplicate notifications.

---

## Database Schema

### `students/{studentId}`

```typescript
{
  studentId: string;        // "STU001"
  fullName: string;         // "Aryan Mehta"
  rollNumber: string;       // "001" (unique within class)
  classId: string;          // "CLS001"
  rfidUid: string | null;   // "A31F2B09" (uppercase hex)
  parentName: string;
  parentPhone: string;      // "+91 98765 43210"
  parentEmail: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `attendance/{studentId}_{dateKey}`

Deterministic document ID prevents duplicates at database level.

```typescript
{
  attendanceId: string;     // "STU001_2026-10-14"
  studentId: string;
  classId: string;
  dateKey: string;          // "2026-10-14" (school timezone)
  checkInAt: Timestamp;     // Server-generated, never from ESP32
  status: "present" | "late" | "absent" | "manual";
  deviceId: string;
  source: "rfid" | "manual" | "demo";
  eventId: string;          // Idempotency key from device
  correctedBy?: string;     // userId if manually corrected
  correctionReason?: string;
  createdAt: Timestamp;
}
```

### `devices/{deviceId}`

```typescript
{
  deviceId: string;         // "school-gate-01"
  name: string;
  location: string;
  secretHash: string;       // bcrypt hash of device secret
  isActive: boolean;
  lastSeen: Timestamp | null;
  createdAt: Timestamp;
}
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Set the root directory to `smart-attend` (or your subdirectory)
4. Add all environment variables from `.env.example` to Vercel project settings
5. Deploy

For the `FIREBASE_ADMIN_PRIVATE_KEY`, paste the value with literal `\n` (not actual newlines) in the Vercel dashboard.

---

## Project Structure

```
smart-attend/
├── app/
│   ├── api/attendance/
│   │   ├── scan/route.ts      # ESP32 endpoint (server-only)
│   │   └── export/route.ts    # CSV export
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── students/page.tsx
│   ├── attendance/page.tsx
│   ├── classes/page.tsx
│   ├── reports/page.tsx
│   ├── notifications/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── layout/                # Sidebar, TopNav, DashboardLayout
│   └── students/              # StudentForm
├── hooks/
│   └── useAuth.tsx            # Firebase Auth context + demo mode
├── lib/
│   ├── firebase/client.ts     # Client-side Firebase
│   ├── firebase/admin.ts      # Server-only Firebase Admin
│   ├── services/              # attendance, students, classes, notifications
│   ├── schemas/               # Zod validation schemas
│   ├── notifications/         # Provider abstraction
│   ├── auth/session.ts        # Device auth, session verification
│   ├── demo/data.ts           # Seed data for demo mode
│   └── utils/                 # timezone, export, cn
├── types/index.ts             # All TypeScript types
├── middleware.ts
├── firestore.rules
├── firestore.indexes.json
└── .env.example
```

---

## Security Checklist

- [x] Device secrets stored as bcrypt hashes — never plaintext
- [x] Firebase Admin SDK used only in server-side route handlers
- [x] Client-side Firebase config contains no admin privileges
- [x] Student identity resolved server-side from RFID UID — never trusted from device
- [x] Notification API secrets never reach the browser
- [x] Attendance document IDs are deterministic — prevents duplicates at database level
- [x] EventId deduplication subcollection handles network retries
- [x] Rate limiting: 10 scans/min per device
- [x] Firestore Security Rules enforce role-based access
- [x] Parent phone numbers are masked in UI display
- [x] Error details visible to admins only in notification logs

---

## Demo Mode

When Firebase environment variables are missing, the app automatically enters Demo Mode:

- A purple banner is shown at the top of every page
- Sign in with any credentials (or click "Fill demo credentials")
- All data is served from `lib/demo/data.ts` — realistic but fictional
- Student RFID: `A31F2B09` → Aryan Mehta (Grade 9 - A)
- Use **Settings → Simulate RFID Scan** to test the full scan API flow
- Changes made in forms show a warning and are not persisted

---

## License

MIT
