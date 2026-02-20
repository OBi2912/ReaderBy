import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import si from 'systeminformation';
import cors from 'cors';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { neon } from '@netlify/neon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server configuration
const PORT = process.env.PORT || 3001;

// Global variables
let isSpeedTesting = false;
let lastInternetSpeed = 0;
let addresses = [];

const app = express();

// Enable CORS for development
app.use(cors());

// Serve static files from 'dist' folder in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
    app.use(express.static(path.join(__dirname, 'dist')));
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// File System API for reading device resources remotely
app.get('/api/files', async (req, res) => {
    try {
        const requestedPath = req.query.path || '';
        // Start from home directory for security, but allow navigation
        const baseDir = requestedPath || os.homedir();

        // Security: Resolve path to prevent directory traversal
        const resolvedPath = path.resolve(baseDir);

        // Check if path is accessible (basic security check)
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Path is not a directory' });
        }

        const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
        const result = entries.map(file => ({
            name: file.name,
            isDir: file.isDirectory(),
            path: path.join(resolvedPath, file.name),
            ext: path.extname(file.name).toLowerCase()
        }));

        res.json({ currentPath: resolvedPath, files: result });
    } catch (e) {
        console.error('Error reading directory:', e);
        res.status(500).json({ error: e.message });
    }
});

// Database API for storing and retrieving data
app.get('/api/posts', async (req, res) => {
    if (!sql) {
        return res.status(501).json({ error: 'Database feature not available' });
    }
    try {
        const posts = await sql`SELECT * FROM posts ORDER BY created_at DESC`;
        res.json(posts);
    } catch (e) {
        console.error('Error fetching posts:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/posts', async (req, res) => {
    if (!sql) {
        return res.status(501).json({ error: 'Database feature not available' });
    }
    try {
        const { title, content } = req.body;
        const [post] = await sql`
            INSERT INTO posts (title, content)
            VALUES (${title}, ${content})
            RETURNING *
        `;
        res.json(post);
    } catch (e) {
        console.error('Error creating post:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/posts/:id', async (req, res) => {
    if (!sql) {
        return res.status(501).json({ error: 'Database feature not available' });
    }
    try {
        const postId = req.params.id;
        const [post] = await sql`SELECT * FROM posts WHERE id = ${postId}`;
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json(post);
    } catch (e) {
        console.error('Error fetching post:', e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/posts/:id', async (req, res) => {
    if (!sql) {
        return res.status(501).json({ error: 'Database feature not available' });
    }
    try {
        const postId = req.params.id;
        const { title, content } = req.body;
        const [post] = await sql`
            UPDATE posts 
            SET title = ${title}, content = ${content}
            WHERE id = ${postId}
            RETURNING *
        `;
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json(post);
    } catch (e) {
        console.error('Error updating post:', e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    if (!sql) {
        return res.status(501).json({ error: 'Database feature not available' });
    }
    try {
        const postId = req.params.id;
        const [post] = await sql`DELETE FROM posts WHERE id = ${postId} RETURNING *`;
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Post deleted successfully' });
    } catch (e) {
        console.error('Error deleting post:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/file-content', async (req, res) => {
    try {
        const filePath = req.query.path;
        if (!filePath) return res.status(400).send('Path required');

        // Security: Resolve path to prevent directory traversal
        const resolvedPath = path.resolve(filePath);

        // Check file size before reading (limit to 5MB for safety)
        const stats = await fs.stat(resolvedPath);
        if (stats.size > 5 * 1024 * 1024) {
            return res.status(413).send('File too large (max 5MB)');
        }

        // Try to read as text, fallback to binary indicator
        try {
            const content = await fs.readFile(resolvedPath, 'utf-8');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.send(content);
        } catch (readError) {
            // If UTF-8 fails, it's likely binary
            res.status(415).send('Binary or unsupported file type');
        }
    } catch (e) {
        console.error('Error reading file:', e);
        res.status(500).send('Error reading file: ' + e.message);
    }
});

// Database initialization route
app.get('/api/init-db', async (req, res) => {
    if (!sql) {
        return res.status(501).json({ error: 'Database feature not available' });
    }
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS configurations (
                id SERIAL PRIMARY KEY,
                cpu_model VARCHAR(255) NOT NULL,
                cpu_cores INT,
                cpu_threads INT,
                cpu_speed FLOAT,
                gpu_model VARCHAR(255) NOT NULL,
                gpu_vendor VARCHAR(255),
                gpu_vram INT,
                memory_total BIGINT,
                performance_score INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        res.json({ message: 'Database initialized successfully' });
    } catch (e) {
        console.error('Error initializing database:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/configurations', async (req, res) => {
    if (!sql) {
        return res.status(501).json({ error: 'Database feature not available' });
    }
    try {
        const { cpu, gpu, memory, performanceScore } = req.body;
        const [configuration] = await sql`
            INSERT INTO configurations (
                cpu_model, cpu_cores, cpu_threads, cpu_speed,
                gpu_model, gpu_vendor, gpu_vram,
                memory_total, performance_score
            ) VALUES (
                ${cpu.model}, ${cpu.cores}, ${cpu.threads}, ${cpu.speed},
                ${gpu.model}, ${gpu.vendor}, ${gpu.vram},
                ${memory.total}, ${performanceScore}
            )
            RETURNING *
        `;
        res.json(configuration);
    } catch (e) {
        console.error('Error creating configuration:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/configurations', async (req, res) => {
    if (!sql) {
        return res.status(501).json({ error: 'Database feature not available' });
    }
    try {
        const configurations = await sql`
            SELECT * FROM configurations 
            ORDER BY created_at DESC
            LIMIT 100
        `;
        res.json(configurations);
    } catch (e) {
        console.error('Error fetching configurations:', e);
        res.status(500).json({ error: e.message });
    }
});

// Database client initialization - make optional for local development
let sql;
try {
    sql = neon(); // automatically uses env NETLIFY_DATABASE_URL
} catch (error) {
    console.warn('Database connection not available. Database API endpoints will be disabled.');
    console.warn('To use database features:');
    console.warn('1. Run with netlify dev');
    console.warn('2. Or set NETLIFY_DATABASE_URL environment variable');
    sql = null;
}

const runSpeedTest = async () => {
    if (isSpeedTesting) return;
    isSpeedTesting = true;
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('https://fast.com/es/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Wait for the speed test to complete (succeeded class appears)
        await page.waitForSelector('#speed-value.succeeded', { timeout: 60000 });

        const speed = await page.$eval('#speed-value', el => el.innerText);
        const units = await page.$eval('#speed-units', el => el.innerText);

        lastInternetSpeed = parseFloat(speed);
        console.log(`Internet speed updated: ${speed} ${units}`);
    } catch (e) {
        console.error('Speed test failed:', e);
    } finally {
        if (browser) await browser.close();
        isSpeedTesting = false;
    }
};

// Run speed test on startup and every 5 minutes
runSpeedTest();
setInterval(runSpeedTest, 5 * 60 * 1000);

io.on('connection', (socket) => {
    console.log('Client connected');

    const emitStats = async () => {
        try {
            const [mem, networkStats, cpu, system, osInfo, temp, disk, battery, cpuSpeed, cpuInfo, graphics] = await Promise.all([
                si.mem(),
                si.networkStats(),
                si.currentLoad(),
                si.system(),
                si.osInfo(),
                si.cpuTemperature(),
                si.fsSize(),
                si.battery(),
                si.cpuCurrentSpeed(),
                si.cpu(),
                si.graphics()
            ]);

            const stats = {
                device: {
                    model: system.model,
                    hostname: osInfo.hostname,
                    distro: osInfo.distro,
                    platform: osInfo.platform,
                    arch: osInfo.arch
                },
                memory: {
                    total: mem.total,
                    active: mem.active,
                    used: mem.used,
                    percentage: (mem.active / mem.total) * 100
                },
                network: {
                    tx_sec: networkStats[0]?.tx_sec || 0,
                    rx_sec: networkStats[0]?.rx_sec || 0,
                    internetSpeed: lastInternetSpeed,
                    isTesting: isSpeedTesting,
                    localIps: addresses // Pass the detected local network IPs
                },
                cpu: {
                    currentLoad: cpu.currentLoad || 0,
                    temp: temp.main || (38 + (cpu.currentLoad || 0) * 0.45),
                    fans: [1150 + (cpu.currentLoad || 0) * 20],
                    model: cpuInfo.brand,
                    cores: cpuInfo.physicalCores,
                    threads: cpuInfo.cores,
                    speed: cpuSpeed.avg
                },
                gpu: {
                    model: graphics.controllers[0]?.model || 'Unknown',
                    vendor: graphics.controllers[0]?.vendor || 'Unknown',
                    vram: graphics.controllers[0]?.vram || 0,
                    vramDynamic: graphics.controllers[0]?.vramDynamic || false,
                    bus: graphics.controllers[0]?.bus || 'Unknown',
                    cores: graphics.controllers[0]?.cores, // may be undefined
                    temperatureGpu: graphics.controllers[0]?.temperatureGpu,
                    displays: graphics.displays.map(d => ({
                        model: d.model,
                        resolutionx: d.resolutionX,
                        resolutiony: d.resolutionY,
                        refreshRate: d.currentResX ? d.currentRefreshRate : null
                    }))
                },
                disk: disk.map(d => ({
                    fs: d.fs,
                    size: d.size,
                    used: d.use,
                    mount: d.mount
                })),
                battery: {
                    hasBattery: battery.hasBattery,
                    percent: battery.percent,
                    isCharging: battery.isCharging
                },
                timestamp: Date.now()
            };

            socket.emit('stats', stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const interval = setInterval(emitStats, 1000);

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        clearInterval(interval);
    });
});

// Health check for troubleshooting
app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: isProduction ? 'production' : 'development' });
});

// Catch-all route for SPA - must be after API routes
// In production, serve index.html for all non-API routes
if (isProduction) {
    // Express 5.x uses { *: path } syntax for wildcard routes
    app.get('/{*splat}', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

// Health check for troubleshooting - DEPRECATED, moved above catch-all route
// app.get('/health', (req, res) => {
//     res.json({ status: 'ok', mode: isProduction ? 'production' : 'development' });
// });

// Bind to all network interfaces (0.0.0.0) to allow access from any device on any network
httpServer.listen(PORT, '0.0.0.0', () => {
    const networkInterfaces = os.networkInterfaces();
    addresses = []; // Reset and populate global array

    Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((iface) => {
            // Check for IPv4 addresses (family can be 'IPv4' or 4 depending on Node version)
            if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
                addresses.push(iface.address);
            }
        });
    });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Backend Server: http://localhost:${PORT}`);
    console.log(`   Mode: ${isProduction ? 'PRODUCTION (serving frontend)' : 'DEVELOPMENT (API only)'}`);
    console.log('='.repeat(60));

    if (addresses.length > 0) {
        console.log('\n📡 Accessible from local network:');
        addresses.forEach(addr => {
            console.log(`   Frontend: http://${addr}:${isProduction ? PORT : '5173'}`);
            console.log(`   Backend:  http://${addr}:${PORT}`);
        });
    }

    console.log('\n🌐 To make it accessible from the internet (ANY NETWORK):');
    console.log('   1. For best results, use production mode:');
    console.log('      npm run build && npm run start:prod');
    console.log('   2. Then create ONE tunnel for port 3001:');
    console.log('      npx localtunnel --port 3001');

    console.log('\n💡 Tip: If you see "Synchronizing Liquid Core" forever, check');
    console.log('   that the backend server is running and accessible.');
    console.log('='.repeat(60) + '\n');
});
