# AgileFlow — Backend Server

Express.js + MongoDB REST API for the AgileFlow project management workspace.

## Quick Start

```bash
# 1. Enter the server directory
cd server

# 2. Copy the environment template
copy .env.example .env

# 3. Edit .env — fill in your MongoDB Atlas URI and a strong JWT_SECRET

# 4. Install dependencies
npm install

# 5. Start in development mode (auto-restarts on file change)
npm run dev

# 6. Start in production mode
npm start
```

The API will be available at **http://localhost:5000**.

## API Reference

### Auth (public)
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | `{ name, email, password }` | Create account → returns JWT |
| POST | `/api/auth/login` | `{ email, password }` | Authenticate → returns JWT |

### Epics (🔒 JWT required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/epics` | List user's epics (with task counts) |
| POST | `/api/epics` | Create epic `{ title, description?, color? }` |
| GET | `/api/epics/:id` | Get single epic + counts |
| PUT | `/api/epics/:id` | Update epic fields |
| DELETE | `/api/epics/:id` | Delete epic + cascade-delete its tasks |

### Tasks (🔒 JWT required)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks?epicId=:id` | Get tasks for an epic (sorted by orderIndex) |
| POST | `/api/tasks` | Create task `{ epicId, title, status?, priority?, assignee? }` |
| PUT | `/api/tasks/:id` | Update task (status + orderIndex for DnD) |
| DELETE | `/api/tasks/:id` | Delete a single task |

## Project Structure

```
server/
├── server.js           # Entry point — Express + MongoDB bootstrap
├── .env.example        # Environment variable template
├── models/
│   ├── User.js         # User schema (bcrypt pre-save hook)
│   ├── Epic.js         # Epic schema (owned by User)
│   └── Task.js         # Task schema (belongs to Epic)
├── middleware/
│   └── auth.js         # JWT authentication guard
└── routes/
    ├── auth.js         # /api/auth/*
    ├── epics.js        # /api/epics/*
    └── tasks.js        # /api/tasks/*
```
