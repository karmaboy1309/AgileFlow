<div align="center">

```text
  _             _ _       ___ _               
 /_\   __ _ (_) | ___ | __| |_____ __ __
/ _ \ / _` || | |/ _ \| _| | / _ \ V  V /
/_/ \_\__, ||_|_|\___/|_|   |_\___/\_/\_/ 
       |___/                              
```

# ✨ AgileFlow — Modern Epics & Kanban Project Board
### *Enterprise-Grade Agile Project Management Workspace with Nested Epics and Drag-and-Drop Kanban Boards*

  <p align="center">
    <a href="#-overview">Overview</a> •
    <a href="#-key-highlights--core-capabilities">Key Features</a> •
    <a href="#-system-architecture">Architecture</a> •
    <a href="#-api-endpoint-reference">API Reference</a> •
    <a href="#-quick-start-guide">Quick Start</a>
  </p>

  <br />

  [![React](https://img.shields.io/badge/React-19.2.7-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-8.1.1-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Express.js](https://img.shields.io/badge/Express.js-4.21.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![JWT Security](https://img.shields.io/badge/Security-JWT_Authentication-FF4B4B?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

  <br />
  <hr />

</div>

<br />

## 🌟 Overview

**AgileFlow** is a modern, high-performance, full-stack agile project management workspace. It is designed to help teams and developers plan, coordinate, and execute tasks across customized product milestones or **Epics**.

Built on a robust, decoupled **MERN stack**, AgileFlow pairs a fluid, state-of-the-art **React 19 & Tailwind CSS v4** frontend powered by Vite with a highly responsive **Node.js, Express, & MongoDB Atlas** backend database. AgileFlow boasts smooth drag-and-drop workflows (`todo`, `in-progress`, `done`), automated nested task counters, real-time epic progress percentages, customized card priorities, and secure JWT-based workspace partition protection.

<br />

---

## ⚡ Key Highlights & Core Capabilities

### 🔒 Secure Authentication & Workspace Guards
- **Secure Password Hashing**: Uses salt-factor 12 **BcryptJS** cryptography for all stored password credentials.
- **JSON Web Token Authorization**: Secures REST API calls using signed JWT keys passed via authorization headers.
- **Route Guard Protection**: Dual client-side guards (`PrivateRoute` and `PublicRoute`) restrict workspace views to authenticated members and seamlessly redirect unauthorized visitors.

---

### 📊 Nested Epics & Real-Time Aggregations
- **Lightweight DB Pipeline Aggregations**: The backend runs performant aggregate queries to calculate total tasks and completed tasks for all active epics in a single query.
- **Visual Progress Metrics**: Dashboards feature custom dynamic progress meters detailing Epic execution progress.
- **Theme Color Customizer**: Personalize every Epic's identity on the workspace dashboard using an integrated Hex color selection engine.

---

### 📋 Interactive Kanban Workflow Engine
- **Fluid Drag-and-Drop (DnD)**: Powered by `@hello-pangea/dnd` for smooth, layout-preserving card dragging.
- **Status Lifecycles**: Manage task progression across three distinct columns: `To Do` (`#64748b`), `In Progress` (`#f59e0b`), and `Done` (`#10b981`).
- **Priority Indicator Badges**: Instantly distinguish task urgency with color-coordinated priority markers (`▼ Low`, `■ Med`, `▲ High`).
- **Owner Assignment**: Keep cards organized with explicit assignee metadata fields.

---

### 🧼 Premium UX & Smooth Transitions
- **Toast Notifications**: Interactive status notifications powered by `react-hot-toast` with beautiful custom dark modes.
- **Tailwind v4 Styling**: Custom fluid borders, hover transitions, glassmorphic card overlays, and subtle backdrop blurs.

<br />

---

## 🏗️ System Architecture

### 📂 Directory Map
```text
AgileFlow/
├── server/                     # Express + Mongoose Backend
│   ├── middleware/
│   │   └── auth.js             # JWT authentication guard middleware
│   ├── models/
│   │   ├── User.js             # User Schema (Bcrypt pre-save hashing)
│   │   ├── Epic.js             # Epic Schema (createdBy owner reference)
│   │   └── Task.js             # Task Schema (belongs to Epic; orderIndex for DnD)
│   ├── routes/
│   │   ├── auth.js             # User Auth routes (/api/auth/*)
│   │   ├── epics.js            # Epics management endpoints (/api/epics/*)
│   │   └── tasks.js            # Task card operations (/api/tasks/*)
│   ├── server.js               # Express Server & DB Connection Bootstrap
│   ├── .env.example            # Backend environment template
│   └── package.json            # Server-side scripts & dependencies
├── src/                        # React + Vite Frontend
│   ├── assets/                 # Static resources & logo assets
│   ├── components/
│   │   ├── CreateEpicModal.jsx # Epic creation wizard
│   │   ├── CreateTaskModal.jsx # Task addition form
│   │   ├── KanbanBoard.jsx      # DnD Kanban column engine
│   │   └── Navbar.jsx          # Header navigation & profile management
│   ├── pages/
│   │   ├── BoardPage.jsx       # Board view for an Epic
│   │   ├── DashboardPage.jsx   # Workspace dashboard overview
│   │   ├── LoginPage.jsx       # Auth login view
│   │   └── RegisterPage.jsx    # Auth sign-up view
│   ├── api.js                  # Axios client configuration with JWT injection
│   ├── App.css                 # Custom styles and override transitions
│   ├── App.jsx                 # Routing logic & React Toast setup
│   ├── index.css               # Core Tailwind directives & layout config
│   └── main.jsx                # React App DOM renderer
├── index.html                  # HTML entry point template
├── package.json                # Frontend package configurations
└── vite.config.js              # Vite server & build configurations
```

### 🔁 Request Lifecycle & State Sync
```text
┌───────────┐         HTTP Request (JWT Header)         ┌──────────────┐
│  Client   │ ────────────────────────────────────────> │ Express Port │
│  (React)  │ <──────────────────────────────────────── │    (5000)    │
└─────┬─────┘         JSON Response (Success/Error)     └──────┬───────┘
      │                                                        │
      │ Save Token                                             │ Query / Mutate
      ▼                                                        ▼
┌───────────┐                                           ┌──────────────┐
│  Local    │                                           │   MongoDB    │
│  Storage  │                                           │   Database   │
└───────────┘                                           └──────────────┘
```

<br />

---

## 🔌 API Endpoint Reference

### 🔐 Authentication Operations (Public)
| Method | Endpoint | Request Payload | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | `{ name, email, password }` | Registers a new member profile and returns a JWT token. |
| `POST` | `/api/auth/login` | `{ email, password }` | Authenticates existing credentials and returns a JWT token. |

### 📊 Epic Operations (🔒 Requires Valid JWT Header)
| Method | Endpoint | Request Payload | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/epics` | *None* | Fetches a list of all Epics owned by the user, complete with task completion stats. |
| `POST` | `/api/epics` | `{ title, description, color }` | Creates a new Epic container. |
| `GET` | `/api/epics/:id` | *None* | Retrieves a specific Epic alongside its corresponding task counters. |
| `PUT` | `/api/epics/:id` | `{ title, description, color }` | Modifies fields of an existing Epic. |
| `DELETE` | `/api/epics/:id` | *None* | Deletes the Epic and triggers a cascade-delete for all nested tasks. |

### 📋 Task Operations (🔒 Requires Valid JWT Header)
| Method | Endpoint | Request Payload | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks?epicId=:id` | *None* | Retrieves all tasks within an Epic, ordered by `orderIndex`. |
| `POST` | `/api/tasks` | `{ epicId, title, description, status, priority, assignee }` | Creates a new task. |
| `PUT` | `/api/tasks/:id` | `{ status, orderIndex, ... }` | Updates task details, status, or Drag-and-Drop board sequence. |
| `DELETE` | `/api/tasks/:id` | *None* | Deletes a specific task. |

<br />

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (Version >= 18.0.0)
- [MongoDB Atlas](https://www.mongodb.com/atlas/database) account or a local MongoDB database instance

---

### Step 1: Clone & Configure Backend Server

1. Open your terminal and navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Setup your local configuration file by copying the template:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your MongoDB credentials and JWT secret key:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/agileflow?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_change_me_in_production
   JWT_EXPIRES_IN=7d
   CLIENT_ORIGIN=http://localhost:5173
   ```
4. Install backend dependencies and launch the API server:
   ```bash
   npm install
   # Start in development mode (nodemon hot reload)
   npm run dev
   ```

---

### Step 2: Configure & Launch Frontend Client

1. Return to the root workspace directory and setup your client environment file:
   ```bash
   cp .env.example .env
   ```
2. By default, the frontend points to the local backend port:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
3. Install frontend modules and run the Vite server:
   ```bash
   npm install
   npm run dev
   ```
4. Open your browser and navigate to **`http://localhost:5173`** to access your workspace!

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
