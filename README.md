# Schedula - Explainable AI-Powered Personal Scheduling System

<p align="center">
  <strong>Intelligently generate and adapt daily task schedules under real-world time constraints</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/Node.js-Express-green?logo=node.js" alt="Node.js Express" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb" alt="MongoDB" />
   <img src="https://img.shields.io/badge/TailwindCSS-3-blue?logo=tailwindcss" alt="Tailwind CSS" />
</p>

---

## 🌟 Overview

Schedula is a production-ready, full-stack web application designed to help users manage their daily tasks intelligently. Unlike traditional schedulers, Schedula uses **explainable AI** with deterministic algorithms to prioritize and schedule tasks, providing clear, human-readable explanations for every scheduling decision.

### Key Differentiators

- **Explainable AI**: Every scheduling decision comes with a clear explanation
- **Deterministic Algorithms**: Reproducible, transparent scheduling logic (not black-box neural networks)
- **Real-time Adaptation**: Dynamic rescheduling when priorities change
- **Energy-Aware Scheduling**: Matches task complexity to optimal work periods
- **Groq-powered language layer (optional)**: type "Finish the report by Friday 5pm, 3 hours, deep focus" and get a prefilled task; get plain-English "why this task?" narratives and a daily briefing. The scheduling engine stays the source of truth, and everything falls back to rule-based behaviour if no key is set or Groq is down.

---

## ✨ Features

### Core Functionality

- ✅ **Smart Task Management** - Create, edit, and organize tasks with rich metadata
- ✅ **AI-Powered Scheduling** - Automatic priority-based scheduling with weighted scoring
- ✅ **Human-Readable Explanations** - Understand why each task is scheduled when it is
- ✅ **Daily Timeline View** - Visual schedule representation with time blocks
- ✅ **User Preferences** - Customizable working hours, deep focus limits, and buffer times

### Scheduling Algorithm

The engine uses a weighted scoring system:

- **Urgency Score (40%)** - How much of the time left before the deadline the task consumes
- **Importance Score (35%)** - Priority level, fixed-time commitment, deep-focus work
- **Risk Score (25%)** - How little working-time slack remains before the deadline

On top of the score it applies hard rules: tasks that cannot be postponed (deadline-feasibility) go first, fixed tasks keep their requested time, nothing is placed in the past, outside working hours, after its deadline, or overlapping another task; buffers are kept between tasks, deep-focus time is capped per day, and everything is computed in the user's own timezone.

### User Experience

- 🎨 Clean, modern UI with Tailwind CSS
- 📱 Responsive design for all devices
- 🔐 Secure JWT-based authentication
- 🌙 Intuitive calendar interface

---

## 🛠️ Tech Stack

### Frontend

| Technology      | Purpose               |
| --------------- | --------------------- |
| React 18        | UI Framework          |
| React Router v6 | Client-side routing   |
| Tailwind CSS    | Utility-first styling |
| Axios           | HTTP client           |
| date-fns        | Date manipulation     |

### Backend

| Technology        | Purpose             |
| ----------------- | ------------------- |
| Node.js           | Runtime environment |
| Express.js        | Web framework       |
| MongoDB           | Database            |
| Mongoose          | ODM                 |
| JWT               | Authentication      |
| bcryptjs          | Password hashing    |
| express-validator | Input validation    |

---

## 📁 Project Structure

```
Schedula/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   └── env.js                # .env loading (GROQ_* in .env wins over stale shell vars)
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── taskController.js     # Task CRUD operations
│   │   ├── scheduleController.js # Scheduling, explanations, suggestions
│   │   ├── aiController.js       # /api/ai status + natural-language parsing
│   │   └── userController.js     # User management
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   ├── rateLimit.js          # Per-user in-memory limiter (protects Groq quota)
│   │   └── validation.js         # Input validation rules
│   ├── models/
│   │   ├── Task.js               # Task schema
│   │   └── User.js               # User schema
│   ├── routes/                   # auth, tasks, schedule, user, ai
│   ├── services/
│   │   ├── schedulingEngine.js   # Deterministic scheduling engine
│   │   ├── groqService.js        # Groq client (timeouts, retries, JSON mode, metrics)
│   │   └── aiService.js          # Parse / narrate / insights + grounding guard + fallbacks
│   ├── utils/
│   │   ├── jwt.js                # Token utilities
│   │   └── timezone.js           # Timezone-aware date maths (Intl, no deps)
│   ├── scripts/checkGroq.js      # npm run check:groq
│   ├── tests/                    # node --test suites (no DB or network needed)
│   ├── evals/                    # Metrics + cross-validation harnesses and results
│   └── server.js                 # Express server setup
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── AISuggestions.js  # AI insights panel
│   │   │   ├── Calendar.js       # Timeline view
│   │   │   ├── ExplanationPanel.js # AI explanation display
│   │   │   ├── Header.js         # Navigation header
│   │   │   ├── QuickAdd.js       # Natural-language quick add (Groq / rules)
│   │   │   ├── TaskForm.js       # Task creation/edit form
│   │   │   ├── TaskItem.js       # Individual task card
│   │   │   └── TaskList.js       # Task list container
│   │   ├── context/
│   │   │   └── AuthContext.js    # Authentication state
│   │   ├── hooks/
│   │   │   └── useAuth.js        # Auth hook
│   │   ├── pages/
│   │   │   ├── Home.js           # Dashboard
│   │   │   ├── Login.js          # Login page
│   │   │   ├── Register.js       # Registration page
│   │   │   └── Settings.js       # User settings
│   │   ├── services/
│   │   │   └── api.js            # API client
│   │   ├── styles/
│   │   │   └── tailwind.css      # Tailwind entry
│   │   ├── utils/
│   │   │   └── dateHelpers.js    # Date utilities
│   │   ├── App.js                # Main app component
│   │   └── index.js              # Entry point
│   └── package.json
│
└── package.json                  # Root package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/DranzerD/Schedula.git
   cd Schedula
   ```

2. **Install dependencies**

   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure environment variables**

   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   # Optional: add GROQ_API_KEY (free at https://console.groq.com/keys)

   # Frontend
   cd ../frontend
   cp .env.example .env.local
   ```

   > **Never put a real key in `.env.example`** — that file is committed. Keys go in `backend/.env` (gitignored). Without `GROQ_API_KEY` the app works fully in rules-only mode.

   Check the Groq setup (never prints the key):

   ```bash
   cd backend && npm run check:groq
   ```

4. **Start MongoDB** (if running locally)

   ```bash
   mongod
   ```

5. **Run the application**

   ```bash
   # From the Schedula directory
   npm run dev
   ```

   This starts both frontend (http://localhost:3000) and backend (http://localhost:5000) concurrently.

---

## 📡 API Reference

### Authentication

| Method | Endpoint             | Description       |
| ------ | -------------------- | ----------------- |
| POST   | `/api/auth/register` | Register new user |
| POST   | `/api/auth/login`    | Login user        |
| GET    | `/api/auth/me`       | Get current user  |

| PUT    | `/api/auth/password` | Change password   |

### Tasks

| Method | Endpoint                  | Description         |
| ------ | ------------------------- | ------------------- |
| GET    | `/api/tasks`              | Get all tasks       |
| GET    | `/api/tasks/today`        | Today's tasks       |
| POST   | `/api/tasks`              | Create task         |
| GET    | `/api/tasks/:id`          | Get single task     |
| PUT    | `/api/tasks/:id`          | Update task         |
| DELETE | `/api/tasks/:id`          | Delete task         |
| POST   | `/api/tasks/:id/complete` | Mark task completed |

### Schedule

| Method | Endpoint                        | Description                                                               |
| ------ | ------------------------------- | ------------------------------------------------------------------------- |
| GET    | `/api/schedule?date=YYYY-MM-DD` | Schedule for a day (read-only)                                            |
| POST   | `/api/schedule/regenerate`      | Recompute, save, and return what moved / was unscheduled                  |
| GET    | `/api/schedule/range`           | Multi-day plan (max 7 days) with carry-over                               |
| GET    | `/api/schedule/explain/:taskId` | Scores + explanation + plain-English narrative (`?ai=false` skips Groq)   |
| GET    | `/api/schedule/suggestions`     | Daily briefing and suggestions (Groq or rules)                            |

### AI

| Method | Endpoint             | Description                                                       |
| ------ | -------------------- | ----------------------------------------------------------------- |
| GET    | `/api/ai/status`     | Whether Groq is configured, models in use, request metrics        |
| POST   | `/api/ai/parse-task` | `{ "text": "..." }` → structured task draft (Groq, else heuristic) |

All AI endpoints require a JWT and are rate limited per user.

### User

| Method | Endpoint             | Description              |
| ------ | -------------------- | ------------------------ |
| GET    | `/api/user/settings` | Get settings             |
| PUT    | `/api/user/settings` | Update settings (incl. timezone) |
| PUT    | `/api/user/profile`  | Update profile           |
| GET    | `/api/user/stats`    | Dashboard stats          |

---

## 🧠 AI Scheduling Algorithm

### How It Works

The scheduling engine uses a **multi-factor weighted scoring** approach:

```javascript
PriorityScore = (Urgency × 0.4) + (Importance × 0.35) + (Risk × 0.25)
```

#### 1. Urgency Score (40% weight)

How much of the remaining time the task would consume (`duration / minutes until deadline`):

- Overdue, or needs all the time left: 100
- Needs at least half of the time left: 80-100
- A quarter to a half: 50-80
- A tenth to a quarter: 20-50
- Less than a tenth: proportionally lower, towards 0

#### 2. Importance Score (35% weight)

- Priority: low 0, medium 30, high 60
- Fixed-time commitment: +30
- Deep-focus work: +10

#### 3. Risk Score (25% weight)

How little slack remains in the user's *working hours* between now and the deadline. No slack (or not enough working time) scores 100; plenty of slack drops towards 0; fixed tasks get +10.

### Explanation Generation

Each scheduled task includes a human-readable explanation:

> "High urgency: deadline within 24 hours. High priority task requires attention. Fixed-time commitment, scheduled as requested."

---

## 🎨 Design System

### Color Palette

| Color              | Hex       | Usage                   |
| ------------------ | --------- | ----------------------- |
| Primary (Indigo)   | `#6366f1` | Buttons, links, accents |
| Secondary (Purple) | `#8b5cf6` | Gradients, highlights   |
| Accent (Pink)      | `#ec4899` | Notifications, alerts   |

### Priority Colors

- **High**: Red (`#ef4444`)
- **Medium**: Yellow (`#f59e0b`)
- **Low**: Green (`#22c55e`)

---

## 🔐 Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with 7-day expiration
- Protected routes with middleware
- Input validation on all endpoints
- CORS configured for frontend origin

---

## 🧪 Testing, Metrics & Cross-Validation

```bash
cd backend
npm test               # 74 tests, no database or network needed
npm run eval:scheduler # scheduling metrics (300 random workloads per scenario)
npm run eval:groq      # live Groq accuracy (needs GROQ_API_KEY; uses free-tier quota)
```

### How the results are cross-validated

"Looks right" is not evidence, so the checks are built to be independent of the code being checked:

1. **Independent validator** - `evals/lib/validator.js` re-checks every produced schedule against 13 hard rules (no overlap, buffers, working hours, deadlines, deep-focus cap, fixed tasks untouched, conservation of tasks, ...) and shares no code with the engine. Run on randomly generated workloads, not hand-picked ones.
2. **Baselines** - the same seeded workloads are scheduled by FIFO, earliest-deadline-first, priority-only and random ordering, so the numbers mean something relative to simple alternatives.
3. **Determinism and explainability** - same input (also shuffled) must give identical output; every slot must have an explanation whose numbers match the scores and whose time matches the slot.
4. **Mutation checks on the tests** - deliberately breaking the engine (e.g. buffer forced to 0, deadlines ignored) must make tests fail. This found two weak tests, which were strengthened.
5. **Hand-labelled gold sets for Groq** - 30 standard + 16 harder phrases with known-correct fields, scored field by field, compared against the offline heuristic parser. Groq text output is also checked by a *grounding guard*: any number in a narrative must appear in the facts supplied, and claims of "scheduled/placed" need a matching fact; otherwise the rule-based text is shown instead.

### Latest measured results (2026-11-09)

Scheduler (300 workloads x 4 scenarios, `evals/results/scheduler-metrics.md`):

- **0 hard-rule violations** across all workloads; determinism 200/200 (re-run and shuffled); explainability 683/683 slots
- Missed feasible deadlines, mean per workload (lower is better), Schedula vs EDF / priority-only / FIFO / random: 0.60 vs 0.86 / 1.55 / 1.89 / 1.93 (10 tasks) and 3.16 vs 3.54 / 4.87 / 5.55 / 5.70 (20 tasks)
- Trade-off: priority-only scores higher on raw priority-weighted value, but misses far more deadlines
- Runtime median: 2.6 ms @10 tasks, 21 ms @100, 101 ms @500, 207 ms @1,000, ~1 s @5,000

Groq (`evals/results/groq-metrics.json`, `openai/gpt-oss-120b`):

- Standard set: 93-100% of cases fully correct across runs (latest run 100%, 30/30) vs 86.7% for the heuristic parser
- Harder set: 94-100% (latest 16/16) vs 31% for the heuristic parser. This set was looked at while tuning prompts, so treat it as a development set, not a clean holdout
- `gpt-oss-20b` (faster, ~0.6 s median): 87-90%
- Median latency ~1 s (120b). One run varies by about +/-3 points because the model is not fully deterministic. Free-tier 429s are retried and, if they persist, fall back to the heuristic parser

### Known limits

- The Mongoose models/queries are not exercised by the automated tests (a fake in-memory Task model is used); try the full flow once against a real MongoDB.
- Eval workloads are synthetic. They test correctness and relative quality, not whether real users find the plans helpful.
- Numeric grounding cannot catch non-numeric judgements in a narrative; the prompts forbid advice and labels, but this is a mitigation, not a proof.
- Groq model names change over time; `npm run check:groq` tells you whether the configured models are still available.

---

## 📈 Future Enhancements

- [ ] Google Calendar integration
- [ ] Recurring tasks support
- [ ] Team/shared calendars
- [ ] Mobile app (React Native)
- [ ] Dark mode
- [ ] Email notifications
- [ ] Analytics dashboard

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Schedula Team**

Built with ❤️ for intelligent productivity

---

<p align="center">
  <strong>⭐ Star this repo if you find it useful!</strong>
</p>
