# 🎩 Board Game Platform (Cờ Tỉ Phú, Mèo Nổ, Uno & Coup)

Welcome to the **Board Game Platform**, a modern, real-time, web-based multiplayer gaming platform featuring four classic games: **Coup**, **Exploding Kittens (Mèo Nổ)**, **Uno**, and **Monopoly (Cờ Tỉ Phú)**. Play with your friends or strategic AI players in real time!

---

## 🚀 Live Deployments (Frontend)

Access the live platform instantly via the following links:
- **Stable Frontend URL**: [https://boardgame-frontend-k2so.onrender.com](https://boardgame-frontend-k2so.onrender.com)
- **Backup Frontend URL**: [https://boardgame-frontend.onrender.com](https://boardgame-frontend.onrender.com)

---

## 🛠️ Technology Stack

Our platform leverages a modern, highly scalable architecture:
* **Frontend**: React (Vite) + Vanilla CSS + TailwindCSS + Framer Motion (for smooth animations and high-fidelity graphics).
* **Backend**: Java 17 + Spring Boot + Spring WebSockets (STOMP protocol) + Spring Security (JWT authentication).
* **Database**: PostgreSQL (Production) / H2 In-Memory (Local Development).
* **Deployment**: Docker & Render (Multi-service deployment with static assets, containerized Java server, and managed database).

---

## 🎮 Game Rules & Features

### 1. 🎩 Monopoly (Cờ Tỉ Phú)
A high-stakes real-time translation of the classic board game of buying properties, charging rents, and building monopolies!
* **Dice & Movement**: Roll two dice to navigate a 40-cell grid. Doubles grant another turn. Three consecutive doubles send you to jail.
* **Property Ownership**: Purchase streets (named after famous Vietnamese cities like Hà Nội, TP HCM, Đà Nẵng, etc.), stations (airports), and utilities.
* **Monopoly & Upgrades**: Own all properties of a color group to build houses and hotels. Upgrading properties increases rent exponentially.
* **Rent & Taxes**: Pay rent when landing on other players' properties. Pay taxes on income/luxury spaces.
* **AI Integration**: Strategic AIs roll, buy properties, and wisely manage cash reserves to build houses and hotels without self-bankrupting.
* **Bankruptcy**: Going below $0 triggers bankruptcy. Assets are transferred to the creditor or returned to the bank. The last standing player wins!

### 2. 🃏 Coup
A game of deception, bluffing, and deduction. Eliminate all other players' influence to win!
* **Roles**: Duke, Assassin, Captain, Ambassador, and Contessa.
* **Actions**: Take Income, Foreign Aid, or perform character-specific actions (e.g., Duke claims 3 coins, Assassin pays 3 coins to assassinate).
* **Challenges & Blocks**: Bluff about your cards! Any player can challenge your action or block it. A failed challenge results in losing a card; a successful challenge forces the challenger to lose a card.
* **AI Integration**: AI opponents calculate bluffing probabilities, issue challenges, block assassinations, and use strategic counters.

### 3. 🙀 Exploding Kittens (Mèo Nổ)
A highly strategic, kitty-powered version of Russian Roulette.
* **Draw & Explode**: Players take turns playing cards and drawing from the deck. Draw an *Exploding Kitten* and you are eliminated, unless you have a *Defuse* card!
* **Actions**:
  * **Defuse**: Disarm the Exploding Kitten and place it back anywhere in the deck.
  * **Attack**: End your turn without drawing and force the next player to take two turns.
  * **Skip**: End your turn without drawing a card.
  * **Favor**: Force another player to give you a card of their choice.
  * **See the Future**: Peek at the top 3 cards of the deck.
  * **Shuffle**: Shuffle the remaining draw pile.
* **AI Integration**: Smart AIs manage their hand size, count cards, plan defenses, and target opponents when they detect an impending explosion.

### 4. 🌈 Uno
The classic color and number matching card game!
* **Gameplay**: Match cards by color or number. First player to discard all cards wins.
* **Action Cards**:
  * **Draw 2**: Next player draws 2 cards and skips their turn.
  * **Skip**: Next player is skipped.
  * **Reverse**: Reverses the order of play.
  * **Wild**: Changes the active color.
  * **Wild Draw 4**: Changes color and forces the next player to draw 4 cards.
* **AI Integration**: AI opponents prioritize high-value cards, block players with few cards left, and dynamically select wild card colors.

---

## 💻 Quick Start (Local Development)

You can run the entire platform locally in development mode.

### Prerequisites
* **Java**: JDK 17 or higher
* **Node.js**: v18 or higher
* **Maven**: Included wrapper (`./mvnw`)

### 1. Start the Backend
The backend defaults to using an H2 In-Memory Database for rapid local development, meaning you do not need PostgreSQL installed locally to run it.
```bash
cd backend
./mvnw spring-boot:run
# Backend API will be available at: http://localhost:8080
# H2 Database Console: http://localhost:8080/h2-console (JDBC URL: jdbc:h2:mem:boardgamedb)
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend Dev Server will be available at: http://localhost:5173
```

---

## 🐳 Docker Deployment (Production-Like)

You can run the full production-ready stack (Frontend + Backend + PostgreSQL) using Docker Compose.

```bash
# Build and run all services in the background
docker-compose up --build -d

# To stop the services
docker-compose down
```
* **Frontend**: Accessible at `http://localhost` (reverse-proxied by Nginx/Static)
* **Backend API**: Accessible at `http://localhost:8080`
* **PostgreSQL Database**: Port `5432`

---

## 📁 Repository Structure

```
Coup-BoardGame/
├── backend/                  # Java / Spring Boot Web Application
│   ├── src/main/java/        # Java Source Code
│   │   └── com/boardgame/    # Game controllers, models, and service classes
│   ├── Dockerfile            # Container build for the Java App
│   └── pom.xml               # Maven Dependency Settings
├── frontend/                 # React + Vite Client Application
│   ├── src/                  # React Components, Pages, and Contexts
│   │   ├── pages/            # MonopolyPage, UnoPage, KittensPage, Coup/Lobby
│   │   └── contexts/         # WebSockets / Authentication
│   ├── public/assets/        # Game Assets & Visual Board
│   ├── Dockerfile            # Frontend Production Static Server
│   └── package.json          # Node Dependencies & Commands
├── docker-compose.yml        # Docker Orchestration config
└── render.yaml               # Infrastructure-as-code for Render deployment
```

---

## 🗺️ Render Deployment Info

The project utilizes the `render.yaml` configuration for Infrastructure-as-Code deployment:
* **Database**: `boardgame-db` - PostgreSQL database.
* **Backend Service**: `boardgame-backend` - Built from `./backend/Dockerfile`. Injects JDBC connection strings and CORS origins.
* **Frontend Service**: `boardgame-frontend` - Built statically from `./frontend`. Rewrites all paths to `/index.html` to support React Router.
