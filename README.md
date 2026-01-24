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

---

## ✨ Features

### Core Functionality

- ✅ **Smart Task Management** - Create, edit, and organize tasks with rich metadata
- ✅ **AI-Powered Scheduling** - Automatic priority-based scheduling with weighted scoring
- ✅ **Human-Readable Explanations** - Understand why each task is scheduled when it is
- ✅ **Daily Timeline View** - Visual schedule representation with time blocks
- ✅ **User Preferences** - Customizable working hours, deep focus limits, and buffer times

### Scheduling Algorithm

The AI uses a weighted scoring system:

- **Urgency Score (40%)** - Based on deadline proximity
- **Importance Score (35%)** - Priority level and estimated duration
- **Risk Score (25%)** - Consequences of missing deadlines (task flexibility)

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
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── taskController.js     # Task CRUD operations
│   │   ├── scheduleController.js # Scheduling logic
│   │   └── userController.js     # User management
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   └── validation.js         # Input validation rules
│   ├── models/
│   │   ├── Task.js               # Task schema
│   │   └── User.js               # User schema
│   ├── routes/
│   │   ├── auth.js               # Auth endpoints
│   │   ├── tasks.js              # Task endpoints
│   │   ├── schedule.js           # Schedule endpoints
│   │   └── user.js               # User endpoints
│   ├── services/
│   │   └── schedulingEngine.js   # Core AI scheduling logic
│   ├── utils/
│   │   └── jwt.js                # Token utilities
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
   git clone https://github.com/yourusername/schedula.git
   cd schedula/Schedula
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

   # Frontend
   cd ../frontend
   cp .env.example .env.local
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

### Tasks

| Method | Endpoint         | Description     |
| ------ | ---------------- | --------------- |
| GET    | `/api/tasks`     | Get all tasks   |
| POST   | `/api/tasks`     | Create task     |
| GET    | `/api/tasks/:id` | Get single task |
| PUT    | `/api/tasks/:id` | Update task     |
| DELETE | `/api/tasks/:id` | Delete task     |

### Schedule

| Method | Endpoint                    | Description           |
| ------ | --------------------------- | --------------------- |
| GET    | `/api/schedule/daily`       | Get daily schedule    |
| POST   | `/api/schedule/generate`    | Generate new schedule |
| GET    | `/api/schedule/suggestions` | Get AI suggestions    |
| POST   | `/api/schedule/reschedule`  | Trigger reschedule    |

### User

| Method | Endpoint                | Description        |
| ------ | ----------------------- | ------------------ |
| GET    | `/api/user/profile`     | Get user profile   |
| PUT    | `/api/user/profile`     | Update profile     |
| PUT    | `/api/user/preferences` | Update preferences |

---

## 🧠 AI Scheduling Algorithm

### How It Works

The scheduling engine uses a **multi-factor weighted scoring** approach:

```javascript
PriorityScore = (Urgency × 0.4) + (Importance × 0.35) + (Risk × 0.25)
```

#### 1. Urgency Score (40% weight)

Calculated based on deadline proximity:

- Overdue: Maximum urgency (100)
- Due today: Very high (95)
- Due within 24h: High (85)
- Due within 3 days: Medium-high (70)
- Due within 7 days: Medium (50)
- No deadline: Low (30)

#### 2. Importance Score (35% weight)

Based on task priority and duration:

- High priority: 90 points
- Medium priority: 60 points
- Low priority: 30 points
- Duration bonus: +10 for long tasks (>2 hours)

#### 3. Risk Score (25% weight)

Based on task flexibility:

- Fixed time tasks: 100 (must be scheduled exactly)
- Movable tasks: 50 (can be rescheduled)

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

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

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
