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

app.use(helmet());
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

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// =======================================================
// RENDER.COM HEALTH CHECK ROUTE (Server ko zinda rakhne ke liye)
// =======================================================
app.get("/render-alive", (req, res) => {
    const htmlResponse = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Server Status: Online</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@700&display=swap');
                body {
                    font-family: system-ui, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: #121212;
                    color: white;
                }
                .card {
                    text-align: center;
                    padding: 40px 50px;
                    background: #1e1e1e;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                    border: 1px solid #333;
                }
                .status {
                    color: #2ecc71;
                    font-size: 24px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .status::before {
                    content: '';
                    display: block;
                    width: 12px;
                    height: 12px;
                    background-color: #2ecc71;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #2ecc71;
                }
                .msg {
                    font-size: 18px;
                    margin-top: 10px;
                    color: #ccc;
                }
                #clock {
                    margin-top: 25px;
                    background-color: #000;
                    color: #00ff7f;
                    font-family: 'Roboto Mono', monospace;
                    font-size: 2.5rem;
                    padding: 15px 25px;
                    border-radius: 10px;
                    border: 2px solid #333;
                    box-shadow: 0 0 15px rgba(0, 255, 127, 0.3) inset;
                    min-width: 300px;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="status">Online</div>
                <div class="msg">Backend server is up and running!</div>
                <div id="clock">00:00:00.000</div>
            </div>

            <script>
                const clockElement = document.getElementById('clock');

                function updateClock() {
                    const now = new Date();

                    // Numbers ko 2 digits ka banane ke liye (e.g., 5 -> 05)
                    const pad = (num) => String(num).padStart(2, '0');
                    
                    // Milliseconds ko 3 digits ka banane ke liye
                    const padMs = (num) => String(num).padStart(3, '0');

                    const hours = pad(now.getHours());
                    const minutes = pad(now.getMinutes());
                    const seconds = pad(now.getSeconds());
                    const milliseconds = padMs(now.getMilliseconds());

                    clockElement.textContent = \`\${hours}:\${minutes}:\${seconds}.\${milliseconds}\`;
                }

                // Har 1 millisecond par clock ko update karo
                setInterval(updateClock, 1);
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
