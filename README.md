# Econ Empire - Multiplayer Economic Strategy Game

A full-stack, real-time multiplayer web application simulating strategic economic gameplay involving production, demand, tariffs, and negotiation between countries.

## 🎮 Game Overview

Econ Empire is a strategic economic simulation where players represent different countries, manage production and demand, set tariff rates, and negotiate in real-time. The game features:

- **5 Countries**: USA, China, Germany, Japan, India
- **5 Products**: Steel, Grain, Oil, Electronics, Textiles
- **Role-based Access**: Operator controls vs Player participation
- **Real-time Multiplayer**: Live updates and chat functionality
- **Round-based Gameplay**: Timed rounds with tariff submissions
- **Economic Strategy**: Production/demand balance and tariff negotiations

## 🏗️ Architecture

### Backend (Node.js + Express + Socket.IO)
- **Authentication**: JWT-based with role management
- **Database**: PostgreSQL with Sequelize ORM
- **Real-time**: Socket.IO for live updates and chat
- **API**: RESTful endpoints for game management

### Frontend (React + Tailwind CSS)
- **Responsive UI**: Modern design with Tailwind CSS
- **Real-time Updates**: Socket.IO client integration
- **Role-based Dashboards**: Operator and Player interfaces
- **Interactive Charts**: Production and tariff visualization

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd gamepro
```

### 2. Database Setup
```bash
# Install PostgreSQL and create database
createdb econempire

# Run the schema (from the database directory)
psql -d econempire -f database/schema.sql
```

### 3. Backend Setup
```bash
cd server
npm install

# Create .env file (optional)
echo "JWT_SECRET=your-secret-key-change-in-production" > .env
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/econempire" >> .env

# Start the server
npm run dev
```

The server will run on `http://localhost:4000`

### 4. Frontend Setup
```bash
cd react-tailwind-css-starter-pack
npm install

# Start the React development server
npm start
```

The frontend will run on `http://localhost:3000`

## 🎯 How to Play

### For the Operator (Username: "pavan")

1. **Login** as operator using username "pavan"
2. **Create Game** by setting the number of rounds (default: 5)
3. **Wait for Players** - Need all 5 players online to start
4. **Start Game** once all players are connected
5. **Monitor Progress** - View all tables, tariff submissions, and chat
6. **Control Rounds** - Start next round or end game early
7. **Export Data** - Download tariff history as CSV

### For Players

1. **Login** with any username (auto-assigned to available countries)
2. **Wait for Game Start** - Operator must start the game
3. **View Your Data** - See your country's production and demand
4. **Set Tariffs** - Only for products your country produces (Round 1+)
5. **Submit Changes** - Before the 15-minute timer expires
6. **Chat & Negotiate** - Use group or private messaging
7. **Monitor Imports** - See tariff rates affecting your demanded products

## 🔧 Game Rules & Logic

### Production & Demand
- Each product's total production across countries = 100 units
- Each product's total demand across countries = 100 units
- Countries produce 2-3 products only
- A country cannot both produce and demand the same product
- Values are randomly generated once per game and locked

### Tariff System
- Tariff rates: 0-100% (randomly initialized)
- Tariff from a country to itself = 0% (always)
- Only production countries can set tariffs for their products
- Tariff changes allowed starting from Round 1
- Players can re-edit tariffs in future rounds

### Round Mechanics
- Each round = 15 minutes
- Game starts only when all 5 players are online
- Operator controls round progression
- Real-time updates for all tariff changes
- Chat history preserved throughout the game

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/players` - Get all players (operator only)

### Game Management
- `POST /api/game/create` - Create new game (operator)
- `POST /api/game/:gameId/start` - Start game (operator)
- `POST /api/game/:gameId/next-round` - Start next round (operator)
- `POST /api/game/:gameId/end` - End game (operator)
- `POST /api/game/:gameId/reset` - Reset game (operator)
- `GET /api/game/:gameId` - Get game data
- `GET /api/game/:gameId/player-data` - Get player-specific data

### Tariff Management
- `POST /api/game/tariffs/submit` - Submit tariff changes (players)
- `GET /api/game/:gameId/tariffs` - Get tariff rates
- `GET /api/game/:gameId/tariffs/history` - Get tariff history (operator)
- `GET /api/game/:gameId/tariffs/matrix/:product` - Get tariff matrix (operator)

## 🔌 WebSocket Events

### Client to Server
- `sendMessage` - Send chat message
- `tariffUpdate` - Broadcast tariff update
- `gameStateUpdate` - Update game state (operator)
- `roundTimerUpdate` - Update round timer (operator)

### Server to Client
- `onlineUsers` - List of online users
- `userStatusUpdate` - User online/offline status
- `gameStateChanged` - Game state updates
- `roundTimerUpdated` - Round timer updates
- `tariffUpdated` - Real-time tariff changes
- `newMessage` - New chat messages

## 🛠️ Development

### Project Structure
```
gamepro/
├── server/                 # Backend Node.js application
│   ├── controllers/        # Route controllers
│   ├── models/            # Sequelize models
│   ├── routes/            # Express routes
│   ├── database/          # Database connection
│   ├── app.js             # Express app setup
│   └── server.js          # Server entry point
├── react-tailwind-css-starter-pack/  # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context
│   │   └── hooks/         # Custom hooks
│   └── public/            # Static assets
├── database/              # Database schema
└── docs/                  # Documentation
```

### Environment Variables
```bash
# Server (.env)
JWT_SECRET=your-secret-key-change-in-production
DATABASE_URL=postgresql://username:password@localhost:5432/econempire
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check database credentials
   - Verify database exists

2. **Socket Connection Failed**
   - Check if server is running on port 4000
   - Verify CORS settings
   - Check firewall settings

3. **Players Can't Join**
   - Ensure all 5 player slots aren't taken
   - Check if usernames are unique
   - Verify WebSocket connection

4. **Tariff Submission Failed**
   - Check if player's country produces the product
   - Verify round is active and time hasn't expired
   - Ensure tariff values are 0-100

## 📊 Features Implemented

- ✅ Full-stack authentication with role-based access
- ✅ Real-time multiplayer with Socket.IO
- ✅ Dynamic country assignment (5 countries, 5 products)
- ✅ Production/demand table generation with constraints
- ✅ Tariff system with validation and real-time updates
- ✅ Round-based gameplay with countdown timers
- ✅ Operator dashboard with full game controls
- ✅ Player dashboard with restricted access
- ✅ Group and private chat system
- ✅ Data export functionality (CSV)
- ✅ Responsive UI with Tailwind CSS
- ✅ Game state persistence with PostgreSQL

## 🚀 Deployment

### Production Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Build React frontend: `npm run build`
4. Deploy backend with process manager (PM2)
5. Set up reverse proxy (Nginx)
6. Configure SSL certificates

### Docker Deployment (Recommended)
```bash
# Build and run with Docker Compose
docker-compose -f docker/docker-compose.yml up -d
```

This will start three services:
- PostgreSQL database
- Backend API server
- Frontend web application

The application will be accessible at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Database: postgresql://postgres:postgres@localhost:5432/econempire

### Environment Configuration
For production deployment, make sure to:
1. Change the JWT_SECRET in server/.env.production
2. Update database credentials if needed
3. Configure FRONTEND_URL to match your domain
4. Set appropriate permissions for production environment

### Manual Deployment
If you prefer to deploy manually without Docker:

1. Set up PostgreSQL database
2. Configure environment variables in server/.env
3. Install dependencies:
   ```bash
   cd server && npm install
   cd ../frontend && npm install
   ```
4. Build frontend:
   ```bash
   cd frontend && npm run build
   ```
5. Start backend server:
   ```bash
   cd server && npm run production
   ```
6. Serve frontend build with a web server (Nginx, Apache, etc.)

### Deployment to Cloud Platforms
The application can be deployed to cloud platforms like:
- Heroku
- AWS Elastic Beanstalk
- Google Cloud Platform
- Microsoft Azure

For cloud deployment, you'll need to:
1. Configure platform-specific environment variables
2. Set up database connection
3. Build and deploy frontend and backend separately or together

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Econ Empire** - Master the art of economic strategy in real-time multiplayer gameplay! 🏛️💰
