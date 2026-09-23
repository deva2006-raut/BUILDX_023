# 🚨 MEDNEXUS 360

**MEDNEXUS 360** is a real-time emergency response coordination platform that unifies **patients, ambulances, hospitals, blood banks, and a command center** on one AI-powered network — so that in an emergency, every second counts.

Built with **React + Vite** frontend and a **Node.js + Express + Socket.IO** backend, featuring a live AI coordinator and hackathon-style crisis simulation scenarios.

## ✨ Features

- 🤖 **MEDNEXUS AI Coordinator** — AI assistant that coordinates the emergency response workflow
- 🏥 **Multi-role ecosystem** — Patient, Ambulance, Hospital, Blood Bank, and Command Center views
- 🚑 **Smart hospital matching** — automatic allocation with alternatives engine
- ⏱️ **Golden hour timer** — 60-minute critical response window tracking
- 📡 **Realtime updates** — Socket.IO powered live status across all roles
- 🗺️ **Live map** — Leaflet-based hospital & ambulance visualization
- 🎛️ **Crisis simulation** (Twist Center) — stress-test the system with:
  - 📈 **Patient surge** — mass-casualty influx
  - 📡 **Network blackout** — offline mode with sync queue & DEMO SMS fallback
  - 🏥 **Hospital overflow** — capacity crisis with recovery & re-allocation
  - ⏳ **Golden hour** — time-critical mission mode

## 🏗️ Architecture

```
┌─────────────────────┐      ┌──────────────────────────┐
│  frontend (Vite)    │ HTTP │  backend (Express)       │
│  React + Leaflet    │◀────▶│  REST API  :4001         │
│  Tailwind UI        │ WS   │  Socket.IO realtime      │
└─────────────────────┘      │  aiCoordinator.js        │
                             │  matchingEngine.js       │
                             │  twistEngine.js (crisis) │
                             └──────────────────────────┘
```

## 🛠️ Tech Stack

| Layer     | Technology                        |
| --------- | --------------------------------- |
| Frontend  | React 19, Vite, Tailwind, Leaflet, Lucide |
| Backend   | Node.js, Express, Socket.IO       |
| AI        | Custom AI Coordinator engine      |
| Linting   | Oxlint                            |

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Installation

```bash
git clone https://github.com/deva2006-raut/BUILDX_023.git
cd BUILDX_023

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Run

**Terminal 1 — Backend** (port 4001):

```bash
cd backend
npm start        # or: node server.js
```

**Terminal 2 — Frontend**:

```bash
cd frontend
npm run dev
```

Then open the Vite dev server URL (default `http://localhost:5173`).

### Demo Accounts

| Username    | Role           |
| ----------- | -------------- |
| `patient`   | Patient        |
| `admin`     | Command Center |
| `hospital`  | Hospital       |
| `ambulance` | Ambulance      |
| `bloodbank` | Blood Bank     |

## 📁 Project Structure

```
backend/
├── server.js            # Express + Socket.IO server (port 4001)
├── aiCoordinator.js     # MEDNEXUS AI assistant
├── matchingEngine.js    # Hospital/patient matching
├── twistEngine.js       # Crisis simulation scenarios
└── data.js              # Seed data
frontend/
├── src/apps/            # Role-based apps (Patient, etc.)
├── src/components/      # AICoordinator, TwistCenter, map, etc.
└── src/pages/           # Landing, Login
```

## 🤝 Team

Built by **Team 23** — 2026.

## 📄 License

MIT © 2026 Devanshu Raut
