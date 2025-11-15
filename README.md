# Machine Monitoring System - Admin Frontend

A modern Next.js frontend application for monitoring machines and viewing real-time logs.

## Features

- 🖥️ Machine status monitoring
- 📊 Real-time log viewer
- 🔍 Advanced log filtering
- 🎨 Modern, responsive UI
- ⚡ Auto-refreshing logs
- 🔌 Ready for WebSocket integration

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client for API calls

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (optional):
Create a `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                 # Next.js app directory
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── components/          # React components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── MachineList.tsx # Machine sidebar
│   ├── LogViewer.tsx   # Log display
│   └── LogFilters.tsx  # Filter controls
├── hooks/              # Custom React hooks
│   ├── useMachines.ts  # Machine data hook
│   └── useMachineLogs.ts # Log data hook
├── services/           # API services
│   └── api.ts          # API client
├── types/              # TypeScript types
│   └── index.ts        # Type definitions
└── lib/                # Utilities
    └── utils.ts        # Helper functions
```

## API Integration

The frontend expects the backend to provide the following endpoints:

- `GET /api/machines` - Get all machines
- `GET /api/machines/:id` - Get machine by ID
- `GET /api/logs` - Get all logs (with optional query params)
- `GET /api/machines/:id/logs` - Get logs for a specific machine

## WebSocket Integration

The project is structured to easily add WebSocket support. You can create a WebSocket service in `services/websocket.ts` and integrate it with the existing hooks.

## Build for Production

```bash
npm run build
npm start
```

## License

MIT

