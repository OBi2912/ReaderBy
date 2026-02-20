# ReaderBy – System Resources Monitor

A real-time system telemetry and resource usage tracking application that works **locally** and **online** with the same codebase.

![ReaderBy Dashboard](./public/pwa-192x192.png)

## Features

- 📊 **Real-time System Stats** – CPU, Memory, Network, Disk, Battery
- 🌐 **Works Everywhere** – Local network, tunnel, or static hosting
- 📱 **PWA Support** – Install as a native app on any device
- 🌙 **Dark/Light Theme** – Automatic and manual theme switching
- 🌍 **Multi-language** – English and Spanish support
- 📈 **Historical Charts** – Visualize network and CPU history

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev:full

# Or start them separately:
npm run server  # Backend on port 3001
npm run dev     # Frontend on port 5173
```

Open `http://localhost:5173` to see your machine's system stats.

### Production Build

```bash
# Build and start production server
npm run deploy

# Or step by step:
npm run build
npm run start:prod
```

The production server serves both frontend and backend on port 3001.

## Deployment Options

### Option 1: Full Stack (Recommended)

Deploy the entire application to any Node.js hosting:

| Platform | Config File | How to Deploy |
|----------|-------------|---------------|
| **Railway** | `railway.json` | Connect GitHub repo, auto-deploys |
| **Render** | `render.yaml` | Connect GitHub repo, auto-deploys |
| **Heroku** | `Procfile` | `heroku create && git push heroku main` |
| **Docker** | `Dockerfile` | `docker-compose up -d` |

### Option 2: Static Hosting + External Backend

Deploy frontend to static hosting and backend separately:

| Frontend | Backend |
|----------|---------|
| Netlify (`netlify.toml`) | Railway |
| Vercel (`vercel.json`) | Render |
| GitHub Pages | Fly.io |
| Cloudflare Pages | Any VPS |

Set `backendUrl` in `public/config.json` to your backend URL.

### Option 3: Tunnel for Quick Sharing

```bash
# Start production server
npm run deploy

# Create a tunnel (in another terminal)
npm run tunnel
```

Share the tunnel URL – the app works immediately!

## How It Works

| Environment | Frontend | Backend | Behavior |
|-------------|----------|---------|----------|
| **Local Dev** | `localhost:5173` | `localhost:3001` | Auto-connects to backend |
| **Production** | `hostname:3001` | `hostname:3001` | Same server serves both |
| **Tunnel** | `tunnel-url` | `tunnel-url` | Tunnel forwards to server |
| **Static Host** | Static files | N/A | Browser mode (client stats) |

## Configuration

### Runtime Config (`public/config.json`)

```json
{
  "backendUrl": ""
}
```

- Leave empty for auto-detect
- Set URL when frontend and backend are on different servers

### Environment Variables (`.env`)

```env
VITE_SERVER_URL=https://your-backend.com
PORT=3001
NODE_ENV=production
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend dev server |
| `npm run server` | Start backend with hot reload |
| `npm run dev:full` | Start both frontend and backend |
| `npm run build` | Build for production |
| `npm run start:prod` | Start production server |
| `npm run deploy` | Build and start production |
| `npm run tunnel` | Create tunnel to port 3001 |
| `npm run docker:build` | Build Docker image |
| `npm run docker:run` | Run Docker container |

## Tech Stack

- **Frontend:** React 19, Vite, Framer Motion, Recharts, Lucide Icons
- **Backend:** Express 5, Socket.io, SystemInformation, Puppeteer
- **PWA:** vite-plugin-pwa for offline support

## Project Structure

```
├── public/           # Static assets
│   └── config.json   # Runtime configuration
├── src/
│   ├── App.jsx       # Main application
│   ├── main.jsx      # Entry point
│   └── utils/        # Utility functions
├── server.js         # Express + Socket.io server
├── vite.config.js    # Vite configuration
├── netlify.toml      # Netlify deployment
├── vercel.json       # Vercel deployment
├── render.yaml       # Render deployment
├── railway.json      # Railway deployment
├── Dockerfile        # Docker deployment
└── docker-compose.yml
```

## Documentation

- [Deployment Guide](./DEPLOYMENT.md) – Detailed deployment instructions

## License

MIT
