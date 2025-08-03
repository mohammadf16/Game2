# NUMBER HUNT
## The Ultimate Social Deduction Web Game

**A modern web-based implementation of the thrilling social deduction game where players must identify the hidden Imposter using only numerical clues.**

---

## 🎮 Game Overview

Number Hunt is a social deduction game where most players answer a specific question with real numbers, while one player (the **Imposter**) receives a completely different question and must bluff their way through without being detected.

**The Challenge:** Can you spot the player who doesn't know what everyone else is talking about?

### Key Features
- **3-12 Players** (optimal: 4-8)
- **Real-time gameplay** with live updates
- **95+ carefully crafted questions** across 5 categories
- **Modern responsive UI** with glassmorphism design
- **Complete scoring system** and game statistics
- **Admin interface** for game management

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Django 4.2+
- Modern web browser

### Installation

1. **Clone and setup:**
```bash
cd numberhunt
pip install -r requirements.txt
```

2. **Database setup:**
```bash
python manage.py migrate
python manage.py seed_questions
```

3. **Create admin user (optional):**
```bash
python manage.py createsuperuser
```

4. **Run the server:**
```bash
python manage.py runserver
```

5. **Play the game:**
Open http://127.0.0.1:8000 in your browser

---

## 🎯 How to Play

### Game Flow
1. **Create or Join Room** - Host creates a room, players join with nicknames
2. **Wait in Lobby** - Gather 3+ players, host starts the game
3. **Answer Phase** - Submit numerical answers to your question
4. **Discussion Phase** - Analyze answers and discuss suspicions
5. **Voting Phase** - Vote for who you think is the imposter
6. **Results** - See if detectives caught the imposter!

### Winning Conditions
- **Detectives Win:** Successfully identify and vote out the imposter
- **Imposter Wins:** Avoid detection and survive the vote

### Scoring
- **Successful Detectives:** 1 point each
- **Successful Imposter:** 2 points
- **Multiple rounds:** Play until someone reaches the target score

---

## 🏗️ Technical Architecture

### Backend (Django)
```
📁 game/
├── models.py          # Game data models
├── views.py           # REST API endpoints
├── serializers.py     # API serialization
├── admin.py           # Admin interface
└── management/
    └── commands/
        └── seed_questions.py  # Question database seeding
```

### Frontend (Vanilla JS + Modern CSS)
```
📁 static/
├── css/
│   └── style.css      # Modern responsive styles
└── js/
    └── app.js         # Game logic and API integration

📁 templates/
└── index.html         # Single-page application
```

### Key Models
- **Question:** Main questions for detectives
- **DecoyQuestion:** Alternative questions for imposters  
- **GameRoom:** Game session management
- **Player:** Player information and scores
- **GameRound:** Individual round data
- **PlayerAnswer:** Submitted answers
- **Vote:** Voting records
- **GameEvent:** Game event logging

---

## 🎲 Question Categories

### 1. Lifestyle & Habits (20 questions)
- Sleep patterns, daily routines, habits
- *Example: "How many hours do you sleep per night?"*

### 2. Preferences & Opinions (20 questions)  
- 1-10 scale ratings on various topics
- *Example: "On a scale of 1-10, how much do you enjoy cooking?"*

### 3. Experiences (20 questions)
- Life experiences, travel, activities
- *Example: "How many different countries have you visited?"*

### 4. Hypothetical (20 questions)
- Imaginary scenarios and choices
- *Example: "How many superpowers would you want to have?"*

### 5. General/Mixed (15 questions)
- Miscellaneous topics and fun questions
- *Example: "How many apps do you have on your phone?"*

### Decoy Questions (15 questions)
Simple number selection prompts for imposters:
- "Pick a number between 1 and 10"
- "Choose a number between 1 and 20"
- etc.

---

## 🔧 API Endpoints

### Room Management
- `POST /api/rooms/create/` - Create new game room
- `GET /api/rooms/` - List available rooms
- `GET /api/rooms/{id}/` - Get room details
- `POST /api/rooms/{id}/join/` - Join room
- `POST /api/rooms/{id}/start/` - Start game

### Game Flow
- `GET /api/rooms/{id}/current-round/` - Get current round info
- `POST /api/rooms/{id}/submit-answer/` - Submit answer
- `POST /api/rooms/{id}/start-voting/` - Start voting phase
- `POST /api/rooms/{id}/submit-vote/` - Submit vote
- `GET /api/rooms/{id}/events/` - Get game events

### User Management
- `POST /api/create-user/` - Create/login user

---

## 🎨 UI Features

### Modern Design
- **Glassmorphism effects** with backdrop blur
- **Gradient backgrounds** and smooth animations
- **Responsive grid layouts** for all screen sizes
- **Real-time notifications** for game events

### Game Phases
- **Menu Screen:** Welcome and game rules
- **Create/Join Screens:** Room setup and joining
- **Lobby Screen:** Player waiting area
- **Game Screen:** Main gameplay interface
- **Results Screen:** Final scores and winners

### Interactive Elements
- **Live player status** with connection indicators
- **Answer bubbles** for submitted responses
- **Voting interface** with player selection
- **Phase indicators** showing current game state

---

## 🔧 Configuration

### Django Settings
```python
# Key settings in numberhunt/settings.py
INSTALLED_APPS = [
    'rest_framework',
    'corsheaders', 
    'channels',
    'game',
]

# CORS for frontend integration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:8000",
]

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}
```

### Game Parameters
- **Min Players:** 3
- **Max Players:** 12 (configurable per room)
- **Default Rounds:** 5 (configurable per room)
- **Polling Interval:** 2 seconds
- **Question Pool:** 95 main + 15 decoy questions

---

## 🚀 Deployment Considerations

### For Production
1. **Security Settings:**
   - Set `DEBUG = False`
   - Configure `ALLOWED_HOSTS`
   - Use environment variables for secrets

2. **Database:**
   - Switch to PostgreSQL/MySQL for production
   - Configure proper database settings

3. **Static Files:**
   - Configure static file serving
   - Consider CDN for assets

4. **WebSocket Support:**
   - Set up Redis for Channels
   - Configure WebSocket routing for real-time features

### For Mobile App Integration
The Django backend is designed to support future mobile app development:
- **RESTful API** ready for mobile consumption
- **Stateless design** with token-based auth potential
- **JSON responses** for easy mobile integration
- **Event logging** for game replay features

---

## 🎯 Future Enhancements

### Planned Features
- **WebSocket integration** for real-time updates
- **Advanced scoring systems** and achievements
- **Custom question sets** and difficulty levels
- **Tournament mode** with brackets
- **Spectator mode** for observers
- **Mobile app** using the same backend

### Technical Improvements
- **Caching layer** for better performance
- **Database optimization** for large player counts
- **Advanced analytics** and game statistics
- **Multi-language support**

---

## 🐛 Troubleshooting

### Common Issues

**Server won't start:**
```bash
# Check if port 8000 is in use
python manage.py runserver 8080
```

**Database issues:**
```bash
# Reset database
rm db.sqlite3
python manage.py migrate
python manage.py seed_questions
```

**Static files not loading:**
```bash
# Collect static files
python manage.py collectstatic
```

**Questions not appearing:**
```bash
# Re-seed questions
python manage.py seed_questions
```

---

## 📝 License & Credits

**Game Design:** Inspired by social deduction classics like Mafia, Werewolf, and Spyfall
**Implementation:** Custom Django + JavaScript implementation
**UI Design:** Modern glassmorphism with custom CSS

---

## 🤝 Contributing

This is a complete implementation ready for extension and customization. Key areas for contribution:
- Additional question categories
- UI/UX improvements  
- Performance optimizations
- Mobile app development
- Advanced game modes

---

**Happy Hunting! 🎯**

*Can you spot the imposter among the numbers?*
