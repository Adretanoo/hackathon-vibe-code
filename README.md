# Delivery Dispatch System

A Node.js core delivery dispatch system with a React frontend visualization.

## Features
- **Backend**: In-memory state, Euclidean distance logic, Dispatch Service API.
- **Frontend**: React + Vite, SVG-based Grid Visualization (100x100), Real-time updates.

## Prerequisites
- Node.js (v16+)
- npm

## How to Run

### Quick Start
Run both backend and frontend from the root directory:
```bash
npm install
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

### Manual Start
If you prefer to run them separately:

**Backend**
```bash
cd backend
npm install
npm start
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Usage
1. Open `http://localhost:5173`.
2. Use the "Add Random Courier" button to spawn couriers.
3. Use the "Add Random Order" button to spawn orders.
4. Click "Assign" on pending orders to trigger the dispatch algorithm.
5. Click "Complete" to simulate delivery completion.
