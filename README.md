<div align="center">

# 🎵 Music Roulette

**Daily song sharing game for friend groups**

Listen. Rate. Compete. Discover music together.

[![React Native](https://img.shields.io/badge/React_Native-013540?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

![App Banner](https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/music-roulette/banner.png)

</div>

---

## 📱 Live Demo

[![Watch Demo Video](https://res.cloudinary.com/YOUR_CLOUD_NAME/video/upload/v1/music-roulette/demo-thumbnail.jpg)](https://res.cloudinary.com/YOUR_CLOUD_NAME/video/upload/v1/music-roulette/demo-video.mp4)

> Click the image to watch the full demo

---

## 📸 Screenshots

<table>
  <tr>
    <td align="center"><strong>Login</strong></td>
    <td align="center"><strong>Rooms List</strong></td>
    <td align="center"><strong>Room Dashboard</strong></td>
  </tr>
  <tr>
    <td><img src="https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/music-roulette/screen-login.png" width="250" /></td>
    <td><img src="https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/music-roulette/screen-rooms.png" width="250" /></td>
    <td><img src="https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/music-roulette/screen-room.png" width="250" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Music Player</strong></td>
    <td align="center"><strong>Leaderboard</strong></td>
    <td align="center"><strong>Profile</strong></td>
  </tr>
  <tr>
    <td><img src="https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/music-roulette/screen-player.png" width="250" /></td>
    <td><img src="https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/music-roulette/screen-leaderboard.png" width="250" /></td>
    <td><img src="https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1/music-roulette/screen-profile.png" width="250" /></td>
  </tr>
</table>

---

## 🎮 What is Music Roulette?

Music Roulette is a daily music discovery game for friend groups. Think of it as a structured way to share and discuss music with friends — like a book club, but for songs.

### How It Works

1. **Create or Join a Room** — Set up a listening room and invite friends with a 6-character code
2. **Drop Your Song** — Every day before the deadline, submit one YouTube track as your "Song of the Day"
3. **Listen to Others** — Play through your friends' picks in the built-in player
4. **Rate & React** — After listening to 90%+ of a track, rate it 1-5 stars and share what you loved
5. **Climb the Leaderboard** — Earn points for completing quests, maintaining streaks, and getting the best ratings

### Game Rules

| Action | Points |
|--------|--------|
| Complete daily quest (listen to all songs) | +10 |
| Best song of the day (most ratings received) | +5 |
| Streak bonus (consecutive days) | +15 |
| Skip without busy pass | -5 |
| Busy passes per week | 3 |

---

## ✨ Features

### Core Gameplay
- 🎵 **YouTube Integration** — Drop any YouTube link, audio extracted automatically
- 🎧 **Built-in Audio Player** — Listen without leaving the app
- ⭐ **Rating System** — 5-star ratings with detailed reactions
- 🏆 **Weekly Leaderboards** — Compete with friends across rooms
- 🔥 **Streak System** — Maintain daily streaks for bonus points

### Multi-Room Support
- 👥 **Unlimited Rooms** — Join as many groups as you want
- 🔑 **Invite Codes** — Easy room sharing with 6-character codes
- ⚙️ **Configurable Rules** — Each room owner can customize deadlines, points, and penalties
- 🌍 **Timezone Support** — Deadlines respect each room's timezone

### Audio Processing
- 🔄 **Auto-Retry Extraction** — Smart retry system for YouTube downloads
- ☁️ **Cloud Storage** — Audio stored on Cloudinary CDN
- 📊 **Live Progress** — Real-time extraction status updates
- 🎯 **Multiple Formats** — Falls back through multiple audio formats

### Player Experience
- 📱 **Optimized for Mobile** — Safe area insets, keyboard avoidance
- 🎨 **Dark Theme** — Easy on the eyes for late-night listening
- 🔒 **Anti-Cheat** — Listen verification prevents skipping
- 💤 **Busy Passes** — Skip days when you're busy without penalty

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React Native (Expo SDK 54) | Cross-platform mobile framework |
| React Navigation | Screen navigation |
| Expo AV | Audio playback |
| Axios | HTTP client |
| AsyncStorage | Local persistence |

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database |
| JWT | Authentication |
| yt-dlp | YouTube audio extraction |
| Cloudinary | Audio file storage |
| node-cron | Scheduled jobs |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Expo EAS | App builds & OTA updates |
| GitHub Actions | CI/CD pipeline |
| Render | Backend hosting |
| MongoDB Atlas | Database hosting |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account (or local MongoDB)
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Android device or emulator

### 1. Clone the Repository

```bash
git clone https://github.com/siddharthkumarrai/music-roulette-game.git
cd music-roulette-game
```

### 2. Setup Backend

```bash
cd music-roulette-backend
npm install

# Create environment file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/music-roulette

# Authentication
JWT_SECRET=your-super-secret-random-string

# Cloudinary (for audio storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# YouTube Cookies (optional, improves reliability)
YOUTUBE_COOKIES_BASE64=your_base64_encoded_cookies

# Server
PORT=5000
API_BASE_URL=http://localhost:5000
CORS_ORIGINS=*
```

Start the server:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### 3. Setup Frontend

```bash
cd ../music-roulette
npm install

# Create environment file
cp .env.example .env
```

Edit `.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Run the App

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or Camera (iOS).

---

## 📦 Building for Production

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build preview APK
eas build --platform android --profile preview
```

### Production Build

```bash
# Build for Play Store
eas build --platform android --profile production
```

### iOS Build

```bash
# Requires Apple Developer Account
eas build --platform ios --profile production
```

---

## 🔄 CI/CD Pipeline

The project uses GitHub Actions for automated deployments:

### Frontend (OTA Updates)

Every push to `main` automatically:
1. Installs dependencies
2. Runs `eas update`
3. Published OTA update to all installed apps

```yaml
# .github/workflows/update.yml
name: OTA Update
on:
  push:
    branches: [main]
    paths: ["music-roulette/**"]
```

### Backend (Render)

Pushes to the backend repository auto-deploy to Render.

---

## 📁 Project Structure

```
music-roulette-game/
├── .github/workflows/        # CI/CD configuration
│   └── update.yml            # OTA update workflow
├── music-roulette/           # React Native frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   └── PlaylistItem.js
│   │   ├── config/           # API configuration
│   │   │   └── api.js
│   │   ├── context/          # React Context providers
│   │   │   └── AuthContext.js
│   │   ├── navigation/       # Screen navigation
│   │   │   └── AppNavigator.js
│   │   └── screens/          # App screens
│   │       ├── LoginScreen.js
│   │       ├── RegisterScreen.js
│   │       ├── RoomsListScreen.js
│   │       ├── CreateRoomScreen.js
│   │       ├── JoinRoomScreen.js
│   │       ├── RoomScreen.js
│   │       ├── MusicPlayerScreen.js
│   │       ├── PlaylistsScreen.js
│   │       ├── LeaderboardScreen.js
│   │       ├── ProfileScreen.js
│   │       ├── RoomSettingsScreen.js
│   │       └── RoomRulesScreen.js
│   ├── assets/               # App icons and splash
│   ├── app.json              # Expo configuration
│   └── eas.json              # EAS Build configuration
├── music-roulette-backend/   # Node.js backend
│   ├── src/
│   │   ├── config/           # Database configuration
│   │   ├── controllers/      # Route handlers
│   │   ├── jobs/             # Scheduled tasks
│   │   ├── middleware/       # Auth & validation
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── utils/            # Helper functions
│   ├── Dockerfile            # Docker configuration
│   └── render.yaml           # Render deployment
└── README.md
```

---

## 🌐 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Groups (Rooms)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups` | Create room |
| POST | `/api/groups/join` | Join room via code |
| GET | `/api/groups` | List my rooms |
| GET | `/api/groups/:id` | Room details |
| PATCH | `/api/groups/:id/settings` | Update settings (owner) |

### Songs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups/:id/songs` | Submit daily song |
| GET | `/api/groups/:id/songs/today` | Get today's quest |

### Listening

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/groups/:id/logs` | Submit listen proof |
| POST | `/api/groups/:id/logs/busy-pass` | Use busy pass |

### Leaderboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups/:id/leaderboard` | Get rankings |
| GET | `/api/groups/:id/leaderboard/history` | Past winners |

### Audio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audio/:videoId/status` | Check extraction status |
| GET | `/api/audio/:videoId/stream` | Stream audio |
| POST | `/api/audio/:videoId/retry` | Retry extraction |

---

## 🎯 Game Mechanics

### Daily Cycle

1. **Morning**: New day starts, busy passes refill (Monday)
2. **Before Deadline**: Members submit their Song of the Day
3. **After Deadline**: Automated scoring begins
4. **Scoring**: Points awarded, streaks updated, weekly winner recorded

### Scoring System

```
Quest Completion:     +10 points
Best Curation:        +5 points
Streak Bonus:         +15 points (every N days)
Unexcused Skip:       -5 points
```

### Streak System

- Complete daily quest OR use busy pass to maintain streak
- Streak bonus triggers every `streakLengthForBonus` days
- Streak resets on unexcused skip

### Weekly Winner

- Winner = player whose songs receive the most ratings
- Tie-breaker: most 5-star curations, then earliest submission
- Recorded every Sunday at midnight

---

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `YOUTUBE_COOKIES_BASE64` | No | Base64 encoded YouTube cookies |
| `PORT` | No | Server port (default: 5000) |
| `API_BASE_URL` | Yes | Public API URL |
| `CORS_ORIGINS` | Yes | Allowed origins |

#### Frontend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend API URL |

### Room Settings

Each room can customize:

| Setting | Default | Description |
|---------|---------|-------------|
| `dailyDeadlineHour` | 23 | Hour to submit song (0-23) |
| `timezone` | UTC | Room timezone |
| `pointsDailyComplete` | 10 | Points for quest completion |
| `pointsBestCurationBonus` | 5 | Points for best song |
| `pointsStreakBonus` | 15 | Points for streak |
| `streakLengthForBonus` | 7 | Days between streak bonuses |
| `penaltyUnexcusedSkip` | -5 | Penalty for skipping |
| `busyPassesPerWeek` | 3 | Weekly busy passes |
| `minReactionLength` | 20 | Min characters for reaction |

---

## 🐛 Known Issues & Limitations

1. **YouTube Extraction**: Some videos may fail due to YouTube restrictions. The app auto-retries 3 times before showing an error.

2. **Audio Availability**: Region-restricted videos may not be accessible. Using YouTube cookies improves reliability.

3. **No Push Notifications**: Deadline reminders are not yet implemented. Add with `expo-notifications`.

4. **iOS Builds**: Requires Apple Developer Account ($99/year) for distribution.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Test changes on both Android and iOS
- Update README if adding new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) for the amazing React Native toolchain
- [Cloudinary](https://cloudinary.com/) for media storage
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for database hosting
- [Render](https://render.com/) for backend hosting

---

## 📞 Support

Having issues? 

- Open an issue on [GitHub](https://github.com/siddharthkumarrai/music-roulette-game/issues)
- Check the [Backend README](music-roulette-backend/README.md) for API documentation

---

<div align="center">

**Made with ❤️ for music lovers**

[⬆ Back to Top](#-music-roulette)

</div>
