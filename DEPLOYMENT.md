# Deployment Guide - Global Access

This guide explains how to make ReaderBy accessible both locally and globally.

## Quick Start

### Local Development

1. **Start the backend server:**
   ```bash
   npm run server
   ```

2. **Start the frontend dev server:**
   ```bash
   npm run dev
   ```

3. **Access locally:**
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3001`

## How the App Works in Different Environments

The app automatically detects the environment and connects appropriately:

| Environment | Frontend | Backend | Behavior |
|-------------|----------|---------|----------|
| **Local Dev** | `localhost:5173` | `localhost:3001` | Auto-connects to backend on port 3001 |
| **Production Server** | `hostname:3001` | `hostname:3001` | Same server serves both |
| **Tunnel (Production)** | `tunnel-url` | `tunnel-url` | Tunnel forwards to production server |
| **Static Host (Netlify, Vercel)** | Static files | N/A | Browser mode (client-side stats) |
| **Hybrid** | Static host | Separate backend | Set `backendUrl` in config.json |

## Making it Work Globally

### Option 1: Production Server + Tunnel (Recommended)

This is the simplest way to share your app globally:

1. **Build and start production server:**
   ```bash
   npm run build && npm run start:prod
   ```
   The production server serves both frontend and backend on port 3001.

2. **Create a tunnel to port 3001:**
   ```bash
   npx localtunnel --port 3001
   ```
   Or use ngrok:
   ```bash
   ngrok http 3001
   ```

3. **Share the tunnel URL** - The app will work immediately because both frontend and backend are served from the same URL.

### Option 2: Runtime config (public/config.json)

Set `backendUrl` in `public/config.json` to your backend's public URL. The app loads this when the page opens, so you can change it without rebuilding. Example:
```json
{ "backendUrl": "https://my-backend.railway.app" }
```

### Option 3: Using Environment Variables (Build time)

1. **Create a `.env` file in the project root:**
   ```env
   VITE_SERVER_URL=https://your-backend-domain.com:3001
   ```

2. **Build and deploy:**
   ```bash
   npm run build
   ```

3. **Deploy the `dist` folder to any static hosting:**
   - Vercel
   - Netlify
   - GitHub Pages
   - Cloudflare Pages
   - Any static host

4. **Deploy the backend server to a cloud service:**
   - Railway
   - Heroku
   - Render
   - DigitalOcean
   - AWS
   - Any Node.js hosting

### Option 4: Frontend on Netlify/Vercel + Backend on Railway

Netlify and similar hosts **only serve static files**. They do not run the Node.js backend. So:

1. **Deploy the backend** to a service that runs Node.js:
   - [Railway](https://railway.app) (recommended)
   - [Render](https://render.com)
   - [Fly.io](https://fly.io)
   - Or any VPS

2. **Get the backend URL** (e.g. `https://your-app.railway.app`).

3. **In your repo**, edit `public/config.json` and set:
   ```json
   { "backendUrl": "https://your-app.railway.app" }
   ```

4. **Deploy the frontend** to Netlify (or redeploy so the updated `config.json` is live). The app will load that URL and connect to your backend.

### Option 5: Same Domain Deployment

If you deploy both frontend and backend on the same domain:

1. **Frontend:** Deploy to root (e.g., `https://yourdomain.com`)
2. **Backend:** Deploy to subdomain or path (e.g., `https://api.yourdomain.com` or `https://yourdomain.com/api`)

3. **Set environment variable:**
   ```env
   VITE_SERVER_URL=https://api.yourdomain.com
   ```

### Option 6: Port Forwarding (Local Network)

1. **Configure your router to forward port 3001** to your computer

2. **Get your public IP address**

3. **Access from anywhere:**
   - `http://YOUR_PUBLIC_IP:3001` (production server serves both frontend and backend)

## Environment Variables

### Frontend (.env)
```env
# Backend server URL (required for global access)
VITE_SERVER_URL=https://your-backend-server.com:3001
```

### Backend
```env
# Server port (optional, defaults to 3001)
PORT=3001

# Node environment
NODE_ENV=production
```

## Deployment Platforms

### Vercel (Frontend)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Set `VITE_SERVER_URL` in Vercel dashboard

### Railway (Backend)
1. Connect your GitHub repo
2. Railway auto-detects Node.js
3. Set environment variables in dashboard
4. Deploy

### Render (Both)
1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `npm install && npm run build` (frontend) or `npm install` (backend)
4. Set start command: `npm run preview` (frontend) or `npm start` (backend)

## Troubleshooting

### Connection Issues

1. **Check backend is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check CORS settings:**
   - Backend should have `cors()` enabled (already configured)

3. **Check firewall:**
   - Ensure port 3001 is open

4. **Check environment variables:**
   - Make sure `VITE_SERVER_URL` is set correctly
   - Rebuild frontend after changing `.env` file

### Global Access Issues

1. **Backend not accessible:**
   - Use tunneling service (localtunnel, ngrok)
   - Deploy backend to cloud service
   - Set up port forwarding

2. **Frontend can't connect:**
   - Verify `VITE_SERVER_URL` is correct
   - Check browser console for errors
   - Ensure backend CORS allows your frontend domain

3. **Tunnel not working:**
   - Make sure you're running the **production server** (`npm run start:prod`) which serves both frontend and backend
   - Create only ONE tunnel to port 3001
   - The app will auto-detect the tunnel environment

## Security Notes

⚠️ **Important:** The current setup allows file system access. For production:

1. Add authentication
2. Restrict file system access
3. Use HTTPS only
4. Add rate limiting
5. Validate all inputs

## Production Checklist

- [ ] Set `VITE_SERVER_URL` environment variable (or use config.json)
- [ ] Deploy backend to cloud service
- [ ] Deploy frontend to static hosting (or use production server)
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Add authentication (if needed)
- [ ] Set up monitoring
- [ ] Configure backups
