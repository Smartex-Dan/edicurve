<p align="center">
  <img src="assets/images/icon.png" width="96" height="96" alt="Edicurve icon" />
</p>

<h1 align="center">Edicurve</h1>
<p align="center"><em>Study smarter, not harder.</em></p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-54.x-black?logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/NativeWind-4.x-38BDF8" />
  <img src="https://img.shields.io/badge/tRPC-11.x-398CCB" />
  <img src="https://img.shields.io/badge/Drizzle%20ORM-0.44-C5F74F?logoColor=black" />
</p>

---

## What is Edicurve?

Edicurve is a cross-platform mobile study companion for secondary school and university students. It combines an AI-powered tutor (Edi), a question bank with past papers, mock exam simulations, a smart planner, and a personal library — all in one app.

---

## Features

| Feature | Description |
|---|---|
| **Edi AI** | GPT-4o powered tutor — explanations, quiz generation, study plans, PDF context |
| **Courses** | Subjects driven by your onboarding choices — no hardcoded content |
| **Mock Exam** | Timed exam simulations per subject or full multi-subject simulation |
| **Weak Topic Tracker** | Auto-aggregates quiz attempt scores per topic to surface gaps |
| **Planner** | Assignment tracker with due-date reminders and push notifications |
| **Library** | PDF upload, note-taking, cloud sync when signed in |
| **Question Bank** | Seeded from CSV past papers — JAMB, WAEC, NECO compatible |
| **Auth** | OAuth login; local-first when signed out |
| **Offline-first** | Core features work without an internet connection |

---

## Tech stack

```
Frontend   Expo Router 6 · React Native 0.81 · NativeWind 4 · TypeScript
Backend    Node.js · Express · tRPC 11 · Drizzle ORM · MySQL
AI         OpenAI GPT-4o (via invokeLLM helper)
Storage    Expo SecureStore · AsyncStorage · cloud storage (signed URLs)
Push       Expo Notifications
```

---

## Project structure

```
edicurve/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx        # Home — streak, stats, quick actions
│   │   ├── exam.tsx         # Mock Exam + Weak Topics
│   │   ├── courses.tsx      # Subjects from onboarding
│   │   ├── tutor.tsx        # Edi AI chat
│   │   ├── profile.tsx      # Account, analytics links, preferences
│   │   ├── planner.tsx      # Tasks & reminders (hidden from nav)
│   │   └── library.tsx      # Notes & PDFs (hidden from nav)
│   ├── onboarding.tsx       # 3-step setup (goals, subjects, schedule)
│   ├── quiz.tsx             # AI-generated quiz screen
│   └── profile.tsx          # Legacy — now promoted to tab
├── server/
│   ├── _core/               # tRPC, auth, LLM, notifications, storage
│   ├── routers.ts           # All tRPC routes
│   ├── db.ts                # Drizzle query functions
│   └── storage.ts           # File storage helpers
├── drizzle/
│   └── schema.ts            # Database schema
├── seed/
│   ├── seed.ts              # CSV seeder script
│   └── questions/           # Drop CSVs here (mathematics.csv, physics.csv …)
├── components/              # Shared UI components
├── hooks/                   # useAuth, useColors, useColorScheme
├── lib/                     # tRPC client, onboarding context, notifications
└── constants/               # Theme, OAuth config
```

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- MySQL database (local or remote)
- OpenAI API key
- Expo Go app (for device preview) or Android emulator

### 1. Clone & install

```bash
git clone https://github.com/your-username/edicurve.git
cd edicurve
pnpm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/edicurve

# OpenAI
OPENAI_API_KEY=sk-...

# Auth (OAuth provider credentials)
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret

# Storage (S3-compatible)
STORAGE_ENDPOINT=https://...
STORAGE_BUCKET=edicurve-assets
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...

# App
APP_URL=http://localhost:8081
SERVER_PORT=3000
```

### 3. Push the database schema

```bash
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate
```

### 4. Seed the question bank (optional but recommended)

Add CSV files to `seed/questions/` following this format:

```csv
subject,topic,question,option_a,option_b,option_c,option_d,correct,explanation,year,source,difficulty
Physics,Mechanics,A body of mass 4 kg moves at 5 m/s. What is its KE?,25 J,50 J,100 J,200 J,B,KE = ½mv²...,2019,JAMB,easy
```

Then run:

```bash
pnpm add csv-parse
npx tsx seed/seed.ts
```

**Sources for past questions:**
- [myschool.ng/jamb-past-questions](https://myschool.ng/classroom/jamb-past-questions)
- [examword.com](https://examword.com)
- [waecdirect.org](https://waecdirect.org)
- [pastneco.com](https://pastneco.com)

### 5. Start the dev server

```bash
pnpm dev
```

This concurrently runs:
- **Express + tRPC backend** on port 3000
- **Expo Metro bundler** on port 8081

---

## Running on Android

```bash
pnpm android
```

Or scan the QR code from `pnpm dev` with the **Expo Go** app on your Android device.

> **Can Edicurve be published as an Android APK?**
> Yes. Run `eas build --platform android --profile preview` with Expo EAS. Edicurve is a fully native Expo app — it compiles to a real Android APK/AAB and can be submitted to the Play Store. It is **not** a website.

---

## Running on the web

```bash
pnpm dev:metro
```

Open [http://localhost:8081](http://localhost:8081) in your browser. Web support is enabled via `react-native-web` — useful for development preview, not the primary target platform.

---

## Building for production

**Backend:**
```bash
pnpm build        # Bundles server to dist/index.js
pnpm start        # Runs production server
```

**Mobile (Expo EAS):**
```bash
npm install -g eas-cli
eas login
eas build --platform android   # APK / AAB
eas build --platform ios       # IPA (requires Apple developer account)
```

---

## Database schema overview

| Table | Purpose |
|---|---|
| `users` | OAuth accounts |
| `assignments` | Planner tasks with due dates and reminders |
| `notes` | Library text notes |
| `studySchedules` | Onboarding goals, subjects, days, reminder config |
| `pushTokens` | Expo push notification device tokens |
| `subjects` | Question bank subjects (seeded from CSV) |
| `topics` | Topics per subject |
| `questions` | Past paper questions with options, answer, explanation |
| `quizAttempts` | Every quiz/exam attempt — source tagged ai/bank/exam |
| `bookmarks` | Bookmarked questions per user |

---

## Roadmap

- [x] Auth, onboarding, planner, library, Edi AI chat
- [x] Question bank schema + CSV seeder
- [x] Mock Exam tab + weak topic display
- [x] Courses screen driven by student subjects
- [ ] Timed exam session with auto-scoring
- [ ] Real weak topic aggregation from `quizAttempts`
- [ ] Analytics screen with per-subject score trends
- [ ] Question bank practice screen with filters (year, topic, difficulty)
- [ ] Bookmark review mode
- [ ] Leaderboard / study group features

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

---

## License

MIT © Daven — [Smartex Dan](https://github.com/Smartex-Dan)
