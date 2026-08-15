# 🎵 Music Roulette (Android App)

A generic, multiplayer music-listening game — like WhatsApp groups, but for
daily song sharing. Anyone can create or join any number of "rooms," each
with any number of members. Every scoring rule adapts to the room's actual
size automatically.

---

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo SDK 51)
- **Navigation:** React Navigation (native-stack)
- **Player:** `react-native-youtube-iframe`
- **Backend:** Node.js + Express + MongoDB (see `../music-roulette-backend`)
- **Auth:** JWT, stored in AsyncStorage

---

## 🚀 Getting Started

### 1. Get the backend running first

This app is just the client — it needs the API. See
`music-roulette-backend/README.md` for full setup. Quick version:

```bash
cd music-roulette-backend
npm install
cp .env.example .env   # fill in MongoDB URI + JWT secret
npm run dev
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Point the app at your backend

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_API_URL=http://<your-backend-host>:5000/api
```

If testing on a physical phone with Expo Go, `localhost` won't work — use
your computer's LAN IP (e.g. `http://192.168.1.42:5000/api`). If you deploy
the backend (Render/Railway), use that public URL instead.

### 4. Run it

```bash
npx expo start
```

Scan the QR with Expo Go, or press `a` for an Android emulator.

### 5. Build a real APK

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

---

## 🎮 How the generic multi-room design works

- **Sign up once, join unlimited rooms.** Your account isn't tied to any
  single group — just like WhatsApp, you can be in as many rooms as you want
  and switch between them from the Rooms list.
- **Create a room with any size.** `CreateRoomScreen` lets you set `maxMembers`
  (2–50) and a deadline hour — the backend enforces it, nothing is hardcoded.
- **Join via invite code.** Every room gets a 6-character code (shown in
  `RoomSettingsScreen`) — share it like a WhatsApp invite link.
- **Everything scales with room size.** The "listening quest" for any room
  is always *(everyone else's song for today)* — 2 songs in a 3-person room,
  9 songs in a 10-person room — computed fresh from the member list, never
  hardcoded to a number.

---

## 📁 Project Structure

```
music-roulette/
├── App.js
├── src/
│   ├── config/api.js              (axios client, JWT auto-attach)
│   ├── context/AuthContext.js     (register/login/logout)
│   ├── navigation/AppNavigator.js (auth stack + main stack)
│   └── screens/
│       ├── LoginScreen.js / RegisterScreen.js
│       ├── RoomsListScreen.js     (all rooms you're in)
│       ├── CreateRoomScreen.js    (make a new room, any size)
│       ├── JoinRoomScreen.js      (join via invite code)
│       ├── RoomScreen.js          (daily drop + quest, per room)
│       ├── RoomSettingsScreen.js  (invite code, members, rules)
│       ├── MusicPlayerScreen.js   (locked player, rating, reaction, skip)
│       └── LeaderboardScreen.js   (weekly/monthly, per room)
```

## ⚠️ Known limitations

- YouTube's embedded player has no official "disable seeking" API — the seek
  bar is hidden via injected CSS, a strong deterrent but not bulletproof.
- Room rule editing (`PATCH /groups/:groupId/settings`) is wired up on the
  backend but not yet exposed as a form in `RoomSettingsScreen` — currently
  owner-only via direct API call. Good candidate for a follow-up screen.
- No push notifications for the daily deadline yet — add with
  `expo-notifications` when ready.
