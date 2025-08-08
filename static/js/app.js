// static/js/app.js - Complete Enhanced Version

class NumberHuntGame {
    constructor() {
        this.currentUser = null;
        this.currentRoom = null;
        this.currentRound = null;
        this.gameState = 'menu';
        this.pollInterval = null;
        this.authManager = null;
        this.selectedRoomId = null;
        this.selectedVotePlayerId = null;
        this.leaderboardType = 'score';
        
        console.log('NumberHuntGame constructor called');
        this.initializeApp();
    }
    
    async   initializeApp() {
        console.log('Initializing Number Hunt Game...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupApp();
            });
        } else {
            this.setupApp();
        }
    }
    
    async   setupApp() {
        console.log('Setting up app...');
        
        // Prevent refresh when in game
        window.addEventListener('beforeunload', (e) => {
            if (this.gameState === 'lobby' || this.gameState === 'playing') {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (this.authManager && this.authManager.isAuthenticated()) {
                this.showMainMenu();
            } else {
                this.showAuthScreen();
            }
        });
        
        // Wait for auth manager to be ready
        await this.waitForAuthManager();
        console.log('Auth manager ready, continuing setup...');
        
        // Listen for auth state changes
        window.addEventListener('authStateChanged', (event) => {
            this.handleAuthStateChange(event.detail);
        });
        
        // Hide all screens first
        this.hideAllScreens();
        
        // Check authentication and show appropriate screen
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
    
    async waitForAuthManager() {
        return new Promise((resolve) => {
            const checkAuthManager = () => {
                if (window.authManager && window.authManager.isReady) {
                    this.authManager = window.authManager;
                    console.log('Auth manager found and ready');
                    resolve();
                } else {
                    console.log('Waiting for auth manager...');
                    setTimeout(checkAuthManager, 50);
                }
            };
            checkAuthManager();
        });
    }
    
    handleAuthStateChange(authState) {
        console.log('Auth state changed:', authState);
        
        if (authState.isAuthenticated) {
            this.currentUser = authState.user;
            this.showMainMenu();
        } else {
            this.currentUser = null;
            this.currentRoom = null;
            this.stopPolling();
            this.showAuthScreen();
        }
        
        this.updateNavigation();
    }
    
    hideAllScreens() {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        console.log('All screens hidden');
    }
    
    showScreen(screenId) {
        console.log('Showing screen:', screenId);
        
        this.hideAllScreens();
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            console.log('Screen shown successfully:', screenId);
        } else {
            console.error('Screen not found:', screenId);
        }
        
        this.updateNavigation();
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Setup tab switching
        this.setupTabSwitching();
        
        // Auth form listeners
        this.setupFormListener('loginForm', (e) => this.handleLogin(e));
        this.setupFormListener('registerForm', (e) => this.handleRegister(e));
        
        // Menu buttons
        this.setupButtonListener('createRoomBtn', () => this.showCreateRoom());
        this.setupButtonListener('joinRoomBtn', () => this.showJoinRoom());
        this.setupButtonListener('joinByCodeBtn', () => this.showJoinByCode());
        this.setupButtonListener('profileBtn', () => this.showProfile());
        this.setupButtonListener('leaderboardBtn', () => this.showLeaderboard());
        
        // Room management
        this.setupFormListener('createRoomForm', (e) => this.handleCreateRoom(e));
        this.setupFormListener('joinRoomForm', (e) => this.handleJoinRoom(e));
        this.setupFormListener('joinByCodeForm', (e) => this.handleJoinByCode(e));
        
        // Game actions
        this.setupButtonListener('startGameBtn', () => this.startGame());
        this.setupButtonListener('toggleReadyBtn', () => this.toggleReady());
        this.setupButtonListener('startVotingBtn', () => this.startVoting());
        this.setupButtonListener('submitVoteBtn', () => this.submitVote());
        this.setupButtonListener('continueBtn', () => this.continueToNextRound());
        this.setupButtonListener('leaveRoomBtn', () => this.leaveRoom());
        
        // Form submissions
        this.setupFormListener('answerForm', (e) => this.handleSubmitAnswer(e));
        this.setupFormListener('profileUpdateForm', (e) => this.handleUpdateProfile(e));
        
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
        
        // Leaderboard tabs
        document.querySelectorAll('[data-leaderboard]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const type = e.target.getAttribute('data-leaderboard');
                this.switchLeaderboardTab(type);
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
    
    setupTabSwitching() {
        console.log('Setting up tab switching...');
        
        const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
        console.log('Found tab buttons:', tabButtons.length);
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = button.getAttribute('data-tab');
                console.log('Tab clicked:', tabName);
                this.switchTab(tabName);
            });
        });
    }
    
    setupFormListener(formId, handler) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', handler);
            console.log('Form listener setup:', formId);
        } else {
            console.warn('Form not found:', formId);
        }
    }
    
    setupButtonListener(buttonId, handler) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', handler);
            console.log('Button listener setup:', buttonId);
        } else {
            console.warn('Button not found:', buttonId);
        }
    }
    
    // Tab switching functionality
    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
                console.log('Tab button activated:', tabName);
            }
        });
        
        // Update tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            console.log('Tab content shown:', tabName);
        } else {
            console.error('Tab content not found:', `${tabName}Tab`);
        }
    }
    
    // Authentication Methods
    showAuthScreen() {
        console.log('Showing auth screen');
        this.gameState = 'auth';
        this.showScreen('authScreen');
        
        setTimeout(() => {
            this.switchTab('login');
        }, 100);
    }
    
    async handleLogin(e) {
        e.preventDefault();
        console.log('Handling login...');
        
        const formData = new FormData(e.target);
        const loginData = {
            username_or_email: formData.get('username_or_email'),
            password: formData.get('password')
        };
        
        console.log('Login data:', loginData);
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            const result = await this.authManager.login(loginData);
            
            if (result.success) {
                this.currentUser = result.data.user;
                console.log('Login successful, showing main menu');
                // showMainMenu will be called by auth state change event
            } else {
                this.showFormErrors(result.errors, 'loginForm');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.authManager.showErrorMessage('Login failed. Please try again.');
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
        
        console.log('Register data:', registerData);
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            const result = await this.authManager.register(registerData);
            
            if (result.success) {
                this.currentUser = result.data.user;
                console.log('Registration successful, showing main menu');
                // showMainMenu will be called by auth state change event
            } else {
                this.showFormErrors(result.errors, 'registerForm');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.authManager.showErrorMessage('Registration failed. Please try again.');
        } finally {
            this.hideLoading(submitBtn, 'Create Account');
        }
    }
    
    async handleLogout() {
        console.log('Logging out...');
        
        try {
            await this.authManager.logout();
            // Auth state change will handle UI updates
        } catch (error) {
            console.error('Logout error:', error);
            this.authManager.showErrorMessage('Logout failed');
        }
    }
    
    // Navigation and UI Updates
    updateNavigation() {
        const userInfo = document.getElementById('userInfo');
        const authButtons = document.getElementById('authButtons');
        const breadcrumb = document.getElementById('navBreadcrumb');
        
        // Update breadcrumb
        if (breadcrumb) {
            let breadcrumbHTML = '';
            
            if (this.authManager && this.authManager.isAuthenticated()) {
                breadcrumbHTML = '<span class="breadcrumb-item" onclick="game.showMainMenu()">🏠 Home</span>';
                
                if (this.gameState === 'lobby' && this.currentRoom) {
                    breadcrumbHTML += ` <span class="breadcrumb-separator">›</span> <span class="breadcrumb-item current">🏠 ${this.currentRoom.name}</span>`;
                } else if (this.gameState === 'playing' && this.currentRoom) {
                    breadcrumbHTML += ` <span class="breadcrumb-separator">›</span> <span class="breadcrumb-item" onclick="game.showLobby()">🏠 ${this.currentRoom.name}</span>`;
                    breadcrumbHTML += ` <span class="breadcrumb-separator">›</span> <span class="breadcrumb-item current">🎮 Game</span>`;
                }
            }
            
            breadcrumb.innerHTML = breadcrumbHTML;
        }
        
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
        this.loadLeaderboard('score');
    }
    
    showLobby() {
        console.log('Showing lobby screen');
        this.gameState = 'lobby';
        this.showScreen('lobbyScreen');
        this.startPolling();
        this.updateLobbyUI();
    }
    
    showGame() {
        console.log('Showing game screen');
        this.gameState = 'playing';
        this.showScreen('gameScreen');
        this.startPolling();
    }
    
    // Room Management Methods
    async handleCreateRoom(e) {
        e.preventDefault();
        console.log('Creating room...');
        
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            this.authManager.showErrorMessage('Please log in to create a room');
            return;
        }
        
        const formData = new FormData(e.target);
        const roomData = {
            name: formData.get('roomName'),
            description: formData.get('description') || '',
            is_private: formData.get('isPrivate') === 'on',
            password: formData.get('password') || '',
            max_players: parseInt(formData.get('maxPlayers')),
            min_players: 3,
            total_rounds: parseInt(formData.get('totalRounds')),
            difficulty_level: formData.get('difficultyLevel'),
            category_preference: formData.get('categoryPreference') || '',
            discussion_time: parseInt(formData.get('discussionTime') || 180),
            voting_time: parseInt(formData.get('votingTime') || 60),
            allow_rejoining: formData.get('allowRejoining') !== null,
            spectators_allowed: formData.get('spectatorsAllowed') === 'on'
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            this.currentRoom = await this.authManager.apiCall('/rooms/create/', 'POST', roomData);
            this.authManager.showSuccessMessage('Room created successfully!');
            this.showLobby();
        } catch (error) {
            console.error('Room creation failed:', error);
            this.authManager.showErrorMessage('Failed to create room');
        } finally {
            this.hideLoading(submitBtn, 'Create Room');
        }
    }
    
    async loadAvailableRooms() {
        const container = document.getElementById('availableRooms');
        if (!container) return;
        
        container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        try {
            const rooms = await this.authManager.apiCall('/rooms/');
            this.displayAvailableRooms(rooms);
        } catch (error) {
            console.error('Failed to load rooms:', error);
            container.innerHTML = '<p class="text-center">Failed to load available rooms</p>';
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
                    <p><strong>Players:</strong> ${room.player_count}/${room.max_players}</p>
                    <p><strong>Rounds:</strong> ${room.total_rounds}</p>
                    <p><strong>Host:</strong> ${room.host?.username || 'Unknown'}</p>
                    <p><strong>Difficulty:</strong> ${room.difficulty_level}</p>
                    ${room.description ? `<p class="room-description"><strong>Description:</strong> ${room.description}</p>` : ''}
                    ${room.category_preference ? `<p><strong>Category:</strong> ${room.category_preference}</p>` : ''}
                </div>
                <div class="room-settings">
                    <small>Discussion: ${Math.floor(room.discussion_time / 60)}min | Voting: ${Math.floor(room.voting_time / 60)}min</small>
                </div>
            </div>
        `).join('');
    }
    
    selectRoom(roomId) {
        this.selectedRoomId = roomId;
        document.getElementById('selectedRoomId').value = roomId;
        
        // Highlight selected room
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('selected');
        });
        event.target.closest('.room-card').classList.add('selected');
    }
    
    async handleJoinRoom(e) {
        e.preventDefault();
        
        if (!this.selectedRoomId) {
            this.authManager.showErrorMessage('Please select a room to join');
            return;
        }
        
        const formData = new FormData(e.target);
        const joinData = {
            nickname: formData.get('nickname'),
            password: formData.get('password') || ''
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            const response = await this.authManager.apiCall(`/rooms/${this.selectedRoomId}/join/`, 'POST', joinData);
            this.currentRoom = response.room;
            this.authManager.showSuccessMessage('Joined room successfully!');
            this.showLobby();
        } catch (error) {
            console.error('Failed to join room:', error);
            this.authManager.showErrorMessage('Failed to join room: ' + error.message);
        } finally {
            this.hideLoading(submitBtn, 'Join Selected Room');
        }
    }
    
    async handleJoinByCode(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const joinData = {
            room_code: formData.get('roomCode').toUpperCase(),
            nickname: formData.get('nickname'),
            password: formData.get('password') || ''
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            const response = await this.authManager.apiCall('/rooms/join-by-code/', 'POST', joinData);
            this.currentRoom = response.room;
            this.authManager.showSuccessMessage('Joined room successfully!');
            this.showLobby();
        } catch (error) {
            console.error('Failed to join room by code:', error);
            this.authManager.showErrorMessage('Failed to join room. Check the room code.');
        } finally {
            this.hideLoading(submitBtn, 'Join Room');
        }
    }
    
    // Profile Methods
    async loadProfileData() {
        const container = document.getElementById('profileContainer');
        if (!container) return;
        
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading profile...</p></div>';
        
        try {
            const stats = await this.authManager.getStatistics();
            this.displayProfileData(stats);
        } catch (error) {
            console.error('Failed to load profile data:', error);
            container.innerHTML = '<p class="text-center">Failed to load profile data</p>';
        }
    }
    
    displayProfileData(stats) {
        const container = document.getElementById('profileContainer');
        if (!container || !stats) return;
        
        const profile = stats.profile;
        
        container.innerHTML = `
            <div class="card profile-card">
                <div class="profile-header">
                    <div class="profile-avatar">
                        ${this.authManager.getAvatarEmoji(profile.avatar)}
                    </div>
                    <div class="profile-info">
                        <h2>${profile.user.username}</h2>
                        <p class="profile-level">${profile.experience_level}</p>
                        <p class="profile-rank">Global Rank: #${profile.rank}</p>
                    </div>
                </div>
                
                <div class="profile-stats">
                    <div class="stat-group">
                        <h3>Game Statistics</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-value">${profile.total_games}</span>
                                <span class="stat-label">Total Games</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${profile.total_wins}</span>
                                <span class="stat-label">Games Won</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${profile.win_rate.toFixed(1)}%</span>
                                <span class="stat-label">Win Rate</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${profile.total_score}</span>
                                <span class="stat-label">Total Score</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-group">
                        <h3>Performance by Role</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-value">${profile.detective_win_rate.toFixed(1)}%</span>
                                <span class="stat-label">Detective Win Rate</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${profile.imposter_win_rate.toFixed(1)}%</span>
                                <span class="stat-label">Imposter Win Rate</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${profile.best_win_streak}</span>
                                <span class="stat-label">Best Win Streak</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${profile.consecutive_wins}</span>
                                <span class="stat-label">Current Streak</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${stats.achievements.length > 0 ? `
                    <div class="achievements-section">
                        <h3>Recent Achievements</h3>
                        <div class="achievements-list">
                            ${stats.achievements.slice(0, 5).map(ach => `
                                <div class="achievement-item ${ach.is_completed ? 'completed' : ''}">
                                    <span class="achievement-icon">${ach.achievement.icon}</span>
                                    <div class="achievement-info">
                                        <h4>${ach.achievement.name}</h4>
                                        <p>${ach.achievement.description}</p>
                                        ${!ach.is_completed ? `<div class="progress-bar">
                                            <div class="progress-fill" style="width: ${ach.progress_percentage}%"></div>
                                        </div>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    async handleUpdateProfile(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const profileData = {
            avatar: formData.get('avatar'),
            preferred_category: formData.get('preferred_category'),
            bio: formData.get('bio')
        };
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            await this.authManager.updateProfile(profileData);
            this.loadProfileData(); // Refresh profile display
        } catch (error) {
            console.error('Failed to update profile:', error);
            this.authManager.showErrorMessage('Failed to update profile');
        } finally {
            this.hideLoading(submitBtn, 'Update Profile');
        }
    }
    
    // Leaderboard Methods
    async loadLeaderboard(type = 'score') {
        this.leaderboardType = type;
        const container = document.getElementById('leaderboardContainer');
        if (!container) return;
        
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading leaderboard...</p></div>';
        
        try {
            const data = await this.authManager.getLeaderboard(type);
            this.displayLeaderboard(data);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            container.innerHTML = '<p class="text-center">Failed to load leaderboard</p>';
        }
    }
    
    displayLeaderboard(data) {
        const container = document.getElementById('leaderboardContainer');
        if (!container || !data) return;
        
        container.innerHTML = `
            <div class="leaderboard-list">
                ${data.leaderboard.map((player, index) => `
                    <div class="leaderboard-item ${player.user.username === this.currentUser?.username ? 'current-user' : ''}">
                        <div class="rank">#${index + 1}</div>
                        <div class="player-info">
                            <span class="avatar">${this.authManager.getAvatarEmoji(player.avatar)}</span>
                            <span class="username">${player.user.username}</span>
                            <span class="level">${player.experience_level}</span>
                        </div>
                        <div class="stats">
                            ${this.getLeaderboardStat(player, data.type)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    getLeaderboardStat(player, type) {
        switch (type) {
            case 'score':
                return `<span class="stat-value">${player.total_score} pts</span>`;
            case 'wins':
                return `<span class="stat-value">${player.total_wins} wins</span>`;
            case 'win_rate':
                return `<span class="stat-value">${player.win_rate.toFixed(1)}%</span>`;
            default:
                return `<span class="stat-value">${player.total_score} pts</span>`;
        }
    }
    
    switchLeaderboardTab(type) {
        this.leaderboardType = type;
        
        // Update tab buttons
        document.querySelectorAll('[data-leaderboard]').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-leaderboard') === type) {
                tab.classList.add('active');
            }
        });
        
        this.loadLeaderboard(type);
    }
    
    // Game Flow Methods
    updateLobbyUI() {
        if (!this.currentRoom) return;
        
        const roomName = document.getElementById('lobbyRoomName');
        const roomCode = document.getElementById('lobbyRoomCode');
        const playerCount = document.getElementById('lobbyPlayerCount');
        const lobbyPlayers = document.getElementById('lobbyPlayers');
        const roomSettingsDisplay = document.getElementById('roomSettingsDisplay');
        
        if (roomName) roomName.textContent = this.currentRoom.name;
        if (roomCode) roomCode.textContent = this.currentRoom.room_code;
        if (playerCount) playerCount.textContent = `${this.currentRoom.player_count}/${this.currentRoom.max_players}`;
        
        // Display players
        if (lobbyPlayers && this.currentRoom.players) {
            lobbyPlayers.innerHTML = this.currentRoom.players.map(player => `
                <div class="player-card ${player.is_connected ? 'connected' : 'disconnected'}">
                    <div class="player-avatar">${this.authManager.getAvatarEmoji(player.avatar)}</div>
                    <div class="player-name">${player.nickname}</div>
                    <div class="player-status">
                        ${player.is_host ? '👑 Host' : ''}
                        ${player.is_ready ? '✅ Ready' : '⏳ Not Ready'}
                    </div>
                    <div class="player-score">Score: ${player.score}</div>
                </div>
            `).join('');
        }
        
        // Display room settings
        if (roomSettingsDisplay) {
            roomSettingsDisplay.innerHTML = `
                <div class="settings-grid">
                    <div class="setting-item">
                        <span class="setting-label">Max Players:</span>
                        <span class="setting-value">${this.currentRoom.max_players}</span>
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">Total Rounds:</span>
                        <span class="setting-value">${this.currentRoom.total_rounds}</span>
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">Difficulty:</span>
                        <span class="setting-value">${this.currentRoom.difficulty_level}</span>
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">Discussion Time:</span>
                        <span class="setting-value">${Math.floor(this.currentRoom.discussion_time / 60)} minutes</span>
                    </div>
                    <div class="setting-item">
                        <span class="setting-label">Voting Time:</span>
                        <span class="setting-value">${Math.floor(this.currentRoom.voting_time / 60)} minutes</span>
                    </div>
                    ${this.currentRoom.category_preference ? `
                    <div class="setting-item">
                        <span class="setting-label">Category:</span>
                        <span class="setting-value">${this.currentRoom.category_preference}</span>
                    </div>
                    ` : ''}
                </div>
            `;
        }
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
        
        // Handle case where errors might be undefined/null
        if (!errors || typeof errors !== 'object') {
            console.warn('Invalid errors object:', errors);
            return;
        }
        
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
        // Implementation for real-time updates
        if (this.gameState === 'lobby' && this.currentRoom) {
            try {
                const room = await this.authManager.apiCall(`/rooms/${this.currentRoom.id}/`);
                this.currentRoom = room;
                this.updateLobbyUI();
            } catch (error) {
                console.error('Polling error:', error);
            }
        }
    }
    
    // API Helper Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        if (!this.authManager) {
            throw new Error('Auth manager not available');
        }
        return this.authManager.apiCall(endpoint, method, data);
    }
    
    // Placeholder methods for game functionality - IMPLEMENTED
    async startGame() { 
        console.log('Start game'); 
        this.authManager.showErrorMessage('Game functionality will be implemented in Phase 2');
    }
    
    async toggleReady() { 
        if (!this.currentRoom) return;
        
        try {
            const response = await this.authManager.apiCall(`/rooms/${this.currentRoom.id}/toggle-ready/`, 'POST');
            if (response.success) {
                this.authManager.showSuccessMessage(response.message);
                // Update button text
                const readyBtn = document.getElementById('toggleReadyBtn');
                if (readyBtn) {
                    readyBtn.textContent = response.is_ready ? 'Not Ready' : 'Ready';
                    readyBtn.className = response.is_ready ? 'btn btn-warning' : 'btn btn-secondary';
                }
                // Trigger room update
                this.pollForUpdates();
            }
        } catch (error) {
            console.error('Toggle ready error:', error);
            this.authManager.showErrorMessage('Failed to toggle ready status');
        }
    }
    
    async startVoting() { 
        console.log('Start voting'); 
        this.authManager.showErrorMessage('Voting will be implemented in Phase 2');
    }
    
    async submitVote() { 
        console.log('Submit vote'); 
        this.authManager.showErrorMessage('Voting will be implemented in Phase 2');
    }
    
    async continueToNextRound() { 
        console.log('Continue to next round'); 
        this.authManager.showErrorMessage('Game rounds will be implemented in Phase 2');
    }
    
    async leaveRoom() { 
        if (!this.currentRoom) return;
        
        const confirmed = confirm('Are you sure you want to leave this room?');
        if (!confirmed) return;
        
        try {
            const response = await this.authManager.apiCall(`/rooms/${this.currentRoom.id}/leave/`, 'POST');
            if (response.success) {
                this.authManager.showSuccessMessage(response.message);
                this.currentRoom = null;
                this.stopPolling();
                this.showMainMenu();
            }
        } catch (error) {
            console.error('Leave room error:', error);
            this.authManager.showErrorMessage('Failed to leave room');
        }
    }
    
    async handleSubmitAnswer(e) { 
        e.preventDefault();
        console.log('Submit answer'); 
        this.authManager.showErrorMessage('Answer submission will be implemented in Phase 2');
    }
}

// Initialize the game
console.log('Number Hunt Game script loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, waiting for auth manager...');
    
    // Wait for auth manager to be ready
    const initGame = () => {
        if (window.authManager) {
            console.log('Auth manager found, initializing game...');
            window.game = new NumberHuntGame();
        } else {
            console.log('Auth manager not ready, retrying...');
            setTimeout(initGame, 100);
        }
    };
    
    initGame();
});