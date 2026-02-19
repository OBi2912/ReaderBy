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

## When the page doesn't work from another network

If the site works on the same machine but **not from another device or network**:

1. **Backend URL at runtime (no rebuild):**  
   Edit `public/config.json` and set `backendUrl` to the URL where your backend is reachable from that network:
   ```json
   { "backendUrl": "https://your-backend-url.loca.lt" }
   ```
   Then reload the page. Use this when frontend and backend have different URLs (e.g. two tunnels, or frontend on CDN and backend on a server).

2. **Port forwarding:**  
   If you access the app via your public IP (e.g. `http://YOUR_PUBLIC_IP:5173`), your router must forward **both** port **5173** (frontend) and port **3001** (backend) to the same machine. The app will try to connect to `http://YOUR_PUBLIC_IP:3001`.

3. **Tunnels:**  
   If you use localtunnel/ngrok, create one tunnel for the frontend (port 5173) and one for the backend (port 3001). Put the **backend** tunnel URL in `public/config.json` → `backendUrl`, then open the **frontend** tunnel URL in the browser.

## Making it Work Globally

### Option 1: Runtime config (public/config.json)

Set `backendUrl` in `public/config.json` to your backend’s public URL. The app loads this when the page opens, so you can change it without rebuilding. Example:
```json
{ "backendUrl": "https://my-backend.loca.lt" }
```

### Option 2: Using Environment Variables (Build time)

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

### Option 2: Using Tunneling (Quick Testing)

1. **Start backend server:**
   ```bash
   npm run server
   ```

2. **Create tunnel for backend:**
   ```bash
   npm run tunnel:backend
   ```
   This will give you a public URL like: `https://xxxxx.loca.lt`

3. **Set the environment variable:**
   ```env
   VITE_SERVER_URL=https://xxxxx.loca.lt
   ```

4. **Start frontend:**
   ```bash
   npm run dev
   ```

5. **Create tunnel for frontend (optional):**
   ```bash
   npm run tunnel:frontend
   ```

### Option 3: Frontend on Netlify (or Vercel, GitHub Pages)

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
   (Use your real backend URL; no `:3001` if the host uses standard HTTPS.)

4. **Deploy the frontend** to Netlify (or redeploy so the updated `config.json` is live). The app will load that URL and connect to your backend.

### Option 4: Same Domain Deployment

If you deploy both frontend and backend on the same domain:

1. **Frontend:** Deploy to root (e.g., `https://yourdomain.com`)
2. **Backend:** Deploy to subdomain or path (e.g., `https://api.yourdomain.com` or `https://yourdomain.com/api`)

3. **Set environment variable:**
   ```env
   VITE_SERVER_URL=https://api.yourdomain.com
   ```

### Option 5: Port Forwarding (Local Network)

1. **Configure your router to forward ports:**
   - Port 5173 → Your computer (frontend)
   - Port 3001 → Your computer (backend)

2. **Get your public IP address**

3. **Access from anywhere:**
   - Frontend: `http://YOUR_PUBLIC_IP:5173`
   - Backend will be automatically detected

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
   - Ensure ports 3001 and 5173 are open

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

## Security Notes

⚠️ **Important:** The current setup allows file system access. For production:

1. Add authentication
2. Restrict file system access
3. Use HTTPS only
4. Add rate limiting
5. Validate all inputs

## Production Checklist

- [ ] Set `VITE_SERVER_URL` environment variable
- [ ] Deploy backend to cloud service
- [ ] Deploy frontend to static hosting
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Add authentication (if needed)
- [ ] Set up monitoring
- [ ] Configure backups
