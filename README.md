# Board Game Platform

Board Game Online Platform

## 🚀 Quick Start (Development)

### 1. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 2. Backend
```bash
cd backend
./mvnw spring-boot:run
# → http://localhost:8080
# H2 Console: http://localhost:8080/h2-console
```

> **Note**: Backend default use H2 in-memory database. Run directly without PostgreSQL.

---

## 🐳 Docker (Production)

```bash
docker-compose up --build
```

---

## 🎮 Features

- **🃏 Coup** — Full game with bluff, challenge, block
  - Play with strategic AI
  - Real-time multiplayer (WebSocket/STOMP)
  - Create room with 6-character code
- **👤 Accounts** — Register / login with JWT
- **🤝 Friends** — Add, search friends
- **📋 Lobby** — Quick play vs AI

## 🃏 Coup Rules

| Character |  Action   | Blocked by         |
|-----------|-----------|--------------------|
| Duke      | +3 coins  | Block Foreign Aid  |
| Assassin  | -3 coins  | Contessa           |
| Captain   | +2 coins  | Captain, Ambassador|
| Ambassador| Exchange cards | Block steal   |
| Contessa  | -         | Block assassinate  |

## 📁 Structure

```
Coup-BoardGame/
  backend/     # Spring Boot (Java 17)
  frontend/    # React + Vite
  docker-compose.yml
```

## 🗺 Roadmap

- [x] Coup
- [ ] Exploding Kittens
- [ ] Uno
- [ ] Monopoly
