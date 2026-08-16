const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const groupRoutes = require("./routes/groupRoutes");
const audioRoutes = require("./routes/audioRoutes");
const profileRoutes = require("./routes/profileRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));

const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// Generic rate limit — keeps this safe to expose publicly as the game
// grows beyond a handful of private groups.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/", (req, res) => res.json({ status: "ok" }));
app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// =======================================================
// RENDER.COM HEALTH CHECK ROUTE (Server ko zinda rakhne ke liye)
// =======================================================
app.get("/render-alive", (req, res) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const padMs = (n) => String(n).padStart(3, "0");
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${padMs(now.getMilliseconds())}`;
    const htmlResponse = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Server Status: Online</title>
            <style>
                body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#121212;color:#fff}
                .card{text-align:center;padding:40px 50px;background:#1e1e1e;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,.4);border:1px solid #333}
                .status{color:#2ecc71;font-size:24px;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:10px}
                .status::before{content:'';display:block;width:12px;height:12px;background:#2ecc71;border-radius:50%;box-shadow:0 0 10px #2ecc71}
                .msg{font-size:18px;margin-top:10px;color:#ccc}
                #clock{margin-top:25px;background:#000;color:#00ff7f;font-family:'Roboto Mono',monospace;font-size:2.5rem;padding:15px 25px;border-radius:10px;border:2px solid #333;box-shadow:0 0 15px rgba(0,255,127,.3) inset;min-width:300px}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="status">Online</div>
                <div class="msg">Backend server is up and running!</div>
                <div id="clock">${timeStr}</div>
            </div>
            <script>
                const clockEl = document.getElementById('clock');
                const base = new Date('${now.toISOString()}');
                const t0 = Date.now();
                function tick(){
                    const elapsed = Date.now() - t0;
                    const d = new Date(base.getTime() + elapsed);
                    const pad = n => String(n).padStart(2,'0');
                    const padMs = n => String(n).padStart(3,'0');
                    clockEl.textContent = pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds())+'.'+padMs(d.getMilliseconds());
                    requestAnimationFrame(tick);
                }
                requestAnimationFrame(tick);
            </script>
        </body>
        </html>
    `;
    res.status(200).send(htmlResponse);
});
// =======================================================

app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/audio", audioRoutes);
app.use("/api/profile", profileRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
