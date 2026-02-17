# Project Setup and Installation

## Clean Installation Commands

Run these commands in order from the project root:

```bash
# 1. Install root dependencies (concurrently)
npm install

# 2. Install backend dependencies
cd backend
npm install
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Start the application (from root)
npm run dev
```

## Alternative: One-Command Install

```bash
npm run install:all
```

## Project Structure

```
hackathon-vibe-code/
├── package.json          # Root (concurrently only)
├── backend/
│   ├── package.json      # Backend dependencies (express, cors)
│   ├── node_modules/     # Backend dependencies installed here
│   └── src/
│       └── server.js     # Entry point
└── frontend/
    ├── package.json      # Frontend dependencies (React, Vite, Tailwind)
    ├── node_modules/     # Frontend dependencies installed here
    └── src/
        └── App.jsx
```

## Running the Application

- **Development**: `npm run dev` (from root)
- **Backend only**: `npm start` (from backend/)
- **Frontend only**: `npm run dev` (from frontend/)

## Notes

- Backend runs on `http://localhost:3001`
- Frontend runs on `http://localhost:5173`
- No dependencies should exist in root node_modules except `concurrently`
