// static/js/app.js - Fixed version with proper screen management

class NumberHuntGame {
    constructor() {
        this.currentUser = null;
        this.currentRoom = null;
        this.currentRound = null;
        this.gameState = 'menu';
        this.pollInterval = null;
        this.authManager = window.authManager; // Use global auth manager
        
        this.initializeApp();
    }
    
    initializeApp() {
        console.log('Initializing Number Hunt Game...');
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupApp();
            });
        } else {
            this.setupApp();
        }
    }
    
    setupApp() {
        console.log('Setting up app...');
        
        // Hide all screens first
        this.hideAllScreens();
        
        // Check authentication status and show appropriate screen
        if (this.authManager && this.authManager.isAuthenticated()) {
            this.currentUser = this.authManager.user;
            console.log('User is authenticated:', this.currentUser);
            this.showMainMenu();
        } else {
            console.log('User not authenticated, showing auth screen');
            this.showAuthScreen();
        }
        
        this.setupEventListeners();
        this.updateNavigation();
    }
    
    hideAllScreens() {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
    }
    
    showScreen(screenId) {
        console.log('Showing screen:', screenId);
        
        // Hide all screens
        this.hideAllScreens();
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            console.log('Screen shown:', screenId);
        } else {
            console.error('Screen not found:', screenId);
        }
        
        // Update navigation
        this.updateNavigation();
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Auth form listeners
        this.setupFormListener('loginForm', (e) => this.handleLogin(e));
        this.setupFormListener('registerForm', (e) => this.handleRegister(e));
        this.setupButtonListener('logoutBtn', () => this.handleLogout());
        
        // Menu buttons
        this.setupButtonListener('createRoomBtn', () => this.showCreateRoom());
        this.setupButtonListener('joinRoomBtn', () => this.showJoinRoom());
        this.setupButtonListener('joinByCodeBtn', () => this.showJoinByCode());
        this.setupButtonListener('profileBtn', () => this.showProfile());
        this.setupButtonListener('leaderboardBtn', () => this.showLeaderboard());
        
        // Form submissions
        this.setupFormListener('createRoomForm', (e) => this.handleCreateRoom(e));
        this.setupFormListener('joinRoomForm', (e) => this.handleJoinRoom(e));
        this.setupFormListener('joinByCodeForm', (e) => this.handleJoinByCode(e));
        this.setupFormListener('answerForm', (e) => this.handleSubmitAnswer(e));
        this.setupFormListener('profileUpdateForm', (e) => this.handleUpdateProfile(e));
        
        // Game actions
        this.setupButtonListener('startGameBtn', () => this.startGame());
        this.setupButtonListener('toggleReadyBtn', () => this.toggleReady());
        this.setupButtonListener('startVotingBtn', () => this.startVoting());
        this.setupButtonListener('submitVoteBtn', () => this.submitVote());
        this.setupButtonListener('continueBtn', () => this.continueToNextRound());
        this.setupButtonListener('leaveRoomBtn', () => this.leaveRoom());
        
        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.authManager && this.authManager.isAuthenticated()) {
                    this.showMainMenu();
                } else {
                    this.showAuthScreen();
                }
            });
        });
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });
        
        // Private room checkbox
        const isPrivateCheckbox = document.getElementById('isPrivate');
        if (isPrivateCheckbox) {
            isPrivateCheckbox.addEventListener('change', (e) => {
                const passwordGroup = document.getElementById('passwordGroup');
                if (passwordGroup) {
                    passwordGroup.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        // Room code input auto-uppercase
        const roomCodeInput = document.getElementById('roomCode');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
    }
    
    setupFormListener(formId, handler) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', handler);
            console.log('Form listener setup:', formId);
        }
    }
    
    setupButtonListener(buttonId, handler) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', handler);
            console.log('Button listener setup:', buttonId);
        }
    }
    
    // Authentication Methods
    showAuthScreen() {
        console.log('Showing auth screen');
        this.gameState = 'auth';
        this.showScreen('authScreen');
        this.switchTab('login'); // Default to login tab
    }
    
    async handleLogin(e) {
        e.preventDefault();
        console.log('Handling login...');
        
        const formData = new FormData(e.target);
        const loginData = {
            username_or_email: formData.get('username_or_email'),
            password: formData.get('password')
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            const result = await this.authManager.login(loginData);
            
            if (result.success) {
                this.currentUser = result.data.user;
                this.showNotification('Login successful!', 'success');
                this.showMainMenu();
            } else {
                this.showFormErrors(result.errors, 'loginForm');
                this.showNotification('Login failed. Please check your credentials.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        } finally {
            this.hideLoading(submitBtn, 'Login');
        }
    }
    
    async handleRegister(e) {
        e.preventDefault();
        console.log('Handling registration...');
        
        const formData = new FormData(e.target);
        const registerData = {
            username: formData.get('username'),
            email: formData.get('email'),
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            password: formData.get('password'),
            password_confirm: formData.get('password_confirm'),
            avatar: formData.get('avatar') || 'detective_1',
            gender: formData.get('gender') || 'prefer_not_say'
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            const result = await this.authManager.register(registerData);
            
            if (result.success) {
                this.currentUser = result.data.user;
                this.showNotification('Registration successful! Welcome to Number Hunt!', 'success');
                this.showMainMenu();
            } else {
                this.showFormErrors(result.errors, 'registerForm');
                this.showNotification('Registration failed. Please check the form.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Registration failed. Please try again.', 'error');
        } finally {
            this.hideLoading(submitBtn, 'Create Account');
        }
    }
    
    async handleLogout() {
        console.log('Logging out...');
        
        try {
            await this.authManager.logout();
            this.currentUser = null;
            this.currentRoom = null;
            this.stopPolling();
            this.showNotification('Logged out successfully', 'success');
            this.showAuthScreen();
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Logout failed', 'error');
        }
    }
    
    // Navigation and UI Updates
    updateNavigation() {
        const userInfo = document.getElementById('userInfo');
        const authButtons = document.getElementById('authButtons');
        
        if (this.authManager && this.authManager.isAuthenticated() && userInfo) {
            const profile = this.authManager.profile;
            const user = this.authManager.user;
            
            userInfo.innerHTML = `
                <div class="user-display">
                    <span class="user-avatar">${this.authManager.getAvatarEmoji(profile?.avatar || 'detective_1')}</span>
                    <span class="user-name">${user?.username || 'Player'}</span>
                    <span class="user-score">${profile?.total_score || 0} pts</span>
                    <button id="logoutBtn" class="btn btn-secondary btn-sm">Logout</button>
                </div>
            `;
            userInfo.classList.remove('hidden');
            if (authButtons) authButtons.classList.add('hidden');
            
            // Re-setup logout button listener
            this.setupButtonListener('logoutBtn', () => this.handleLogout());
            
        } else if (authButtons) {
            if (userInfo) userInfo.classList.add('hidden');
            authButtons.classList.remove('hidden');
        }
    }
    
    showMainMenu() {
        console.log('Showing main menu');
        this.gameState = 'menu';
        this.showScreen('menuScreen');
        this.stopPolling();
        this.updateUserStats();
    }
    
    async updateUserStats() {
        if (!this.authManager || !this.authManager.isAuthenticated()) return;
        
        try {
            const profile = await this.authManager.getProfile();
            if (profile) {
                this.updateStatsDisplay(profile);
            }
        } catch (error) {
            console.error('Failed to update user stats:', error);
        }
    }
    
    updateStatsDisplay(profile) {
        const statsContainer = document.getElementById('userStatsContainer');
        if (!statsContainer) return;
        
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${profile.total_games || 0}</div>
                    <div class="stat-label">Games Played</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${profile.total_wins || 0}</div>
                    <div class="stat-label">Games Won</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${(profile.win_rate || 0).toFixed(1)}%</div>
                    <div class="stat-label">Win Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${profile.total_score || 0}</div>
                    <div class="stat-label">Total Score</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">#${profile.rank || 'N/A'}</div>
                    <div class="stat-label">Global Rank</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${profile.experience_level || 'Rookie'}</div>
                    <div class="stat-label">Level</div>
                </div>
            </div>
        `;
    }
    
    // Screen Navigation Methods
    showCreateRoom() {
        console.log('Showing create room screen');
        this.showScreen('createRoomScreen');
    }
    
    showJoinRoom() {
        console.log('Showing join room screen');
        this.showScreen('joinRoomScreen');
        this.loadAvailableRooms();
    }
    
    showJoinByCode() {
        console.log('Showing join by code screen');
        this.showScreen('joinByCodeScreen');
    }
    
    showProfile() {
        console.log('Showing profile screen');
        this.showScreen('profileScreen');
        this.loadProfileData();
    }
    
    showLeaderboard() {
        console.log('Showing leaderboard screen');
        this.showScreen('leaderboardScreen');
        this.loadLeaderboard();
    }
    
    showLobby() {
        console.log('Showing lobby screen');
        this.gameState = 'lobby';
        this.showScreen('lobbyScreen');
        this.startPolling();
    }
    
    showGame() {
        console.log('Showing game screen');
        this.gameState = 'playing';
        this.showScreen('gameScreen');
        this.startPolling();
    }
    
    // Tab switching functionality
    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            }
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }
    
    // API Helper Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        if (!this.authManager) {
            throw new Error('Auth manager not available');
        }
        return this.authManager.apiCall(endpoint, method, data);
    }
    
    // Room Management Methods
    async handleCreateRoom(e) {
        e.preventDefault();
        console.log('Creating room...');
        
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            this.showNotification('Please log in to create a room', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        const roomData = {
            name: formData.get('roomName'),
            description: formData.get('description') || '',
            is_private: formData.get('isPrivate') === 'on',
            password: formData.get('password') || '',
            max_players: parseInt(formData.get('maxPlayers')),
            min_players: parseInt(formData.get('minPlayers') || 3),
            total_rounds: parseInt(formData.get('totalRounds')),
            difficulty_level: formData.get('difficultyLevel'),
            category_preference: formData.get('categoryPreference') || '',
            discussion_time: parseInt(formData.get('discussionTime') || 180),
            voting_time: parseInt(formData.get('votingTime') || 60),
            allow_rejoining: formData.get('allowRejoining') !== 'off',
            spectators_allowed: formData.get('spectatorsAllowed') === 'on'
        };
        
        try {
            this.currentRoom = await this.apiCall('/rooms/create/', 'POST', roomData);
            this.showNotification('Room created successfully!', 'success');
            this.showLobby();
            this.updateLobbyUI();
        } catch (error) {
            console.error('Room creation failed:', error);
            this.showNotification('Failed to create room', 'error');
        }
    }
    
    async loadAvailableRooms() {
        try {
            const rooms = await this.apiCall('/rooms/');
            this.displayAvailableRooms(rooms);
        } catch (error) {
            console.error('Failed to load rooms:', error);
            this.showNotification('Failed to load available rooms', 'error');
        }
    }
    
    displayAvailableRooms(rooms) {
        const container = document.getElementById('availableRooms');
        if (!container) return;
        
        if (rooms.length === 0) {
            container.innerHTML = '<p class="text-center">No public rooms available. Create one!</p>';
            return;
        }
        
        container.innerHTML = rooms.map(room => `
            <div class="room-card ${room.status !== 'waiting' || room.player_count >= room.max_players ? 'disabled' : ''}" 
                 onclick="game.selectRoom('${room.id}')">
                <div class="room-header">
                    <h4>${room.name}</h4>
                    <span class="room-status ${room.status}">${room.status}</span>
                </div>
                <div class="room-info">
                    <p>Players: ${room.player_count}/${room.max_players}</p>
                    <p>Rounds: ${room.total_rounds}</p>
                    <p>Host: ${room.host.username}</p>
                </div>
            </div>
        `).join('');
    }
    
    selectRoom(roomId) {
        document.getElementById('selectedRoomId').value = roomId;
        // Highlight selected room
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('selected');
        });
        event.target.closest('.room-card').classList.add('selected');
    }
    
    // UI Helper Methods
    showLoading(button) {
        if (button) {
            button.disabled = true;
            button.innerHTML = '<div class="spinner"></div> Loading...';
        }
    }
    
    hideLoading(button, originalText = 'Submit') {
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
    
    showFormErrors(errors, formId) {
        // Clear previous errors
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        
        const form = document.getElementById(formId);
        if (!form) return;
        
        Object.entries(errors).forEach(([field, messages]) => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = Array.isArray(messages) ? messages[0] : messages;
                input.parentNode.insertBefore(errorDiv, input.nextSibling);
                input.classList.add('error');
            }
        });
    }
    
    showNotification(message, type = 'success') {
        console.log('Notification:', type, message);
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Polling Methods
    startPolling() {
        this.stopPolling();
        this.pollInterval = setInterval(() => {
            this.pollForUpdates();
        }, 2000);
        console.log('Started polling for updates');
    }
    
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
            console.log('Stopped polling');
        }
    }
    
    async pollForUpdates() {
        // Polling implementation for game updates
        // This will be implemented as needed
    }
    
    // Placeholder methods for other features
    async loadProfileData() {
        console.log('Loading profile data...');
        // Implementation pending
    }
    
    async loadLeaderboard() {
        console.log('Loading leaderboard...');
        // Implementation pending
    }
    
    updateLobbyUI() {
        console.log('Updating lobby UI...');
        // Implementation pending
    }
    
    // Additional placeholder methods for game functionality
    async handleJoinRoom(e) { console.log('Join room'); }
    async handleJoinByCode(e) { console.log('Join by code'); }
    async handleSubmitAnswer(e) { console.log('Submit answer'); }
    async handleUpdateProfile(e) { console.log('Update profile'); }
    async startGame() { console.log('Start game'); }
    async toggleReady() { console.log('Toggle ready'); }
    async startVoting() { console.log('Start voting'); }
    async submitVote() { console.log('Submit vote'); }
    async continueToNextRound() { console.log('Continue to next round'); }
    async leaveRoom() { console.log('Leave room'); }
}

// Initialize the game when the script loads
console.log('Number Hunt Game script loaded');

// Wait for DOM and auth manager to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    // Wait a bit for auth manager to be ready
    setTimeout(() => {
        window.game = new NumberHuntGame();
        console.log('Game initialized');
    }, 100);
});