# NumberHunt Game - Phase 1

A Django-based multiplayer number guessing game with authentication, user profiles, achievements, and enhanced gameplay features.

## 🎯 Features

- **User System**: Registration, authentication, profiles with avatars
- **Enhanced Rooms**: Private rooms, passwords, advanced settings
- **Achievement System**: 25+ unlockable achievements
- **Statistics Tracking**: Comprehensive game analytics
- **Leaderboards**: Global rankings and performance metrics
- **Professional UI**: Modern, responsive design with real-time updates

## 🚀 Quick Start

### 1. Clone and Setup Environment
```bash
# Clone the repository
git clone <your-repo-url>
cd numberhunt

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in the project root:
```env
# Database
DATABASE_URL=sqlite:///db.sqlite3  # For development
# DATABASE_URL=postgresql://user:password@localhost:5432/numberhunt  # For production

# Security
SECRET_KEY=your-very-long-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Redis (optional for development)
REDIS_URL=redis://127.0.0.1:6379/0

# Email (for future features)
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### 3. Database Setup
```bash
# Run migrations
python manage.py migrate

# Create superuser for admin access
python manage.py createsuperuser

# Seed the database with questions and achievements
python manage.py seed_questions
python manage.py seed_achievements

# Optional: Create sample data for development
python manage.py create_sample_data --users 20 --rooms 5
```

### 4. Run the Development Server
```bash
python manage.py runserver
```

Visit `http://127.0.0.1:8000` to access the game!

## 📦 Dependencies

```txt
Django==4.2.7
djangorestframework==3.14.0
django-cors-headers==4.3.1
channels==4.0.0
channels-redis==4.1.0
redis==5.0.1
python-decouple==3.8

# Authentication & Security
djangorestframework-authtoken==1.0.0
django-redis==5.4.0
cryptography==41.0.8

# Database (for production)
psycopg2-binary==2.9.9
dj-database-url==2.1.0

# Development & Testing
faker==20.1.0
django-extensions==3.2.3
factory-boy==3.3.0

# Monitoring & Logging
django-health-check==3.17.0
sentry-sdk==1.38.0

# Utils
pillow==10.1.0  # For future avatar uploads
python-dateutil==2.8.2
```

## 📁 Project Structure

```
numberhunt/
├── game/                           # Main game application
│   ├── management/
│   │   └── commands/
│   │       ├── seed_questions.py
│   │       ├── seed_achievements.py
│   │       ├── create_sample_data.py
│   │       ├── update_user_statistics.py
│   │       └── cleanup_old_rooms.py
│   ├── migrations/
│   ├── models.py                   # Enhanced with user system
│   ├── views.py                    # Authentication & enhanced game logic
│   ├── serializers.py              # API serialization
│   ├── admin.py                    # Enhanced admin interface
│   ├── urls.py                     # URL routing
│   └── apps.py
├── numberhunt/                     # Project configuration
│   ├── settings.py                 # Enhanced settings
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── static/                         # Static files
│   ├── css/
│   │   ├── style.css              # Original styles
│   │   └── auth.css               # New authentication styles
│   └── js/
│       ├── app.js                 # Enhanced game logic
│       └── auth.js                # Authentication management
├── templates/
│   └── index.html                  # Enhanced HTML template
├── logs/                           # Log files (created automatically)
├── requirements.txt                # Python dependencies
├── .env                           # Environment variables (create this)
├── manage.py
└── README.md
```

## 🔧 Development Commands

### Database Management
```bash
# Create and apply migrations
python manage.py makemigrations
python manage.py migrate

# Reset database (CAREFUL - deletes all data)
python manage.py flush

# Update user statistics
python manage.py update_user_statistics

# Cleanup old rooms
python manage.py cleanup_old_rooms --hours 24
```

### Data Management
```bash
# Seed questions and achievements
python manage.py seed_questions
python manage.py seed_achievements

# Create sample development data
python manage.py create_sample_data --users 50 --rooms 10

# Export/Import data (for backups)
python manage.py dumpdata game.UserProfile > backup_profiles.json
python manage.py loaddata backup_profiles.json
```

### Development Utilities
```bash
# Run development server with debug
python manage.py runserver --settings=numberhunt.settings

# Django shell for testing
python manage.py shell

# Check for issues
python manage.py check

# Collect static files (for production)
python manage.py collectstatic
```

## 🎮 New Features in Phase 1

### User System
- ✅ User registration with email and username
- ✅ Token-based authentication
- ✅ User profiles with avatars and preferences
- ✅ Comprehensive game statistics tracking
- ✅ Global leaderboards
- ✅ Achievement system with 25+ achievements

### Enhanced Room Management
- ✅ Private rooms with room codes
- ✅ Room passwords for extra security
- ✅ Advanced room settings (timers, categories, difficulty)
- ✅ Player ready status system
- ✅ Reconnection capability for disconnected players
- ✅ Host controls and room transfer

### Game Improvements
- ✅ Persistent game history
- ✅ Detailed performance tracking
- ✅ Win streak calculations
- ✅ Role-based statistics (detective vs imposter)
- ✅ Enhanced scoring system
- ✅ Question categorization and difficulty levels

### UI/UX Enhancements
- ✅ Modern authentication interface
- ✅ Profile dashboard with statistics
- ✅ Enhanced lobby with room settings display
- ✅ Real-time player status indicators
- ✅ Improved navigation and responsive design
- ✅ Loading states and error handling

## 🔍 Testing the Implementation

### 1. User Authentication
1. Register a new account with avatar selection
2. Login/logout functionality
3. Profile updates and statistics display
4. Achievement progress tracking

### 2. Room Management
1. Create public and private rooms
2. Join rooms by browsing or room code
3. Test ready system and host controls
4. Verify reconnection after disconnect

### 3. Enhanced Game Flow
1. Start games with proper authentication
2. Track statistics during gameplay
3. View detailed results with voting analysis
4. Check achievement unlocks

### 4. Admin Interface
1. Access admin at `/admin/`
2. View enhanced user profiles
3. Monitor game statistics
4. Manage achievements and questions

## 🐛 Common Issues & Solutions

### Database Issues
```bash
# If migrations fail
python manage.py migrate --run-syncdb

# If database is corrupted
rm db.sqlite3
python manage.py migrate
python manage.py seed_questions
python manage.py seed_achievements
```

### Authentication Issues
```bash
# Clear browser localStorage if having auth issues
# In browser console: localStorage.clear()

# Reset user tokens
python manage.py shell
>>> from rest_framework.authtoken.models import Token
>>> Token.objects.all().delete()
```

### Static Files Issues
```bash
# Collect static files
python manage.py collectstatic --noinput

# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

## 📈 Performance Considerations

### Database Optimization
- Added indexes for frequent queries
- Optimized user statistics calculations
- Efficient leaderboard queries

### Caching Strategy
- Redis caching for user sessions
- Statistics caching to reduce database load
- Frontend caching for API responses

### Security Enhancements
- Token-based authentication
- Password validation
- Rate limiting for auth endpoints
- CORS configuration for production

## 🔄 Next Steps (Phase 2 Preview)

After successfully implementing Phase 1, the next phase will include:

1. **Real-time WebSocket Communication**
   - Live game updates
   - Chat during discussion phases
   - Real-time player status

2. **Mobile Optimization**
   - Progressive Web App (PWA)
   - Touch-friendly interfaces
   - Offline capability

3. **Advanced Social Features**
   - Friend system
   - Private messaging
   - Group invitations

4. **Enhanced Analytics**
   - Detailed performance graphs
   - Player behavior analysis
   - Game balance insights

## 💡 Tips for Success

1. **Start with sample data** to test all features
2. **Use the admin interface** to monitor user activity
3. **Test with multiple browser tabs** to simulate multiplayer
4. **Monitor the logs** for any issues during development
5. **Backup your database** before making major changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Django community for the excellent framework
- Contributors and testers who helped improve the game
- All players who provide feedback and suggestions

---

**Phase 1 provides a solid foundation with user management, enhanced gameplay, and professional UI. The implementation is production-ready and scalable for future phases!**