// static/js/app.js - Complete Fixed Version with Navigation & State Management

class NumberHuntGame {
    constructor() {
        this.currentUser = null;
        this.currentRoom = null;
        this.currentRound = null;
        this.gameState = 'menu';
        this.pollInterval = null;
        this.authManager = window.authManager;
        
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
        
        // Check if user was in a room before refresh
        const savedRoomId = localStorage.getItem('currentRoomId');
        const savedGameState = localStorage.getItem('gameState');
        
        // Check authentication status and show appropriate screen
        if (this.authManager && this.authManager.isAuthenticated()) {
            this.currentUser = this.authManager.user;
            console.log('User is authenticated:', this.currentUser);
            
            // Try to restore previous state if user was in a room
            if (savedRoomId && savedGameState) {
                this.restoreGameState(savedRoomId, savedGameState);
            } else {
                this.showMainMenu();
            }
        } else {
            console.log('User not authenticated, showing auth screen');
            // Clear any saved state
            localStorage.removeItem('currentRoomId');
            localStorage.removeItem('gameState');
            this.showAuthScreen();
        }
        
        this.setupEventListeners();
        this.updateNavigation();
    }
    
    async restoreGameState(roomId, gameState) {
        try {
            console.log('Restoring game state:', gameState, 'for room:', roomId);
            
            // Try to get room data
            const room = await this.apiCall(`/rooms/${roomId}/`);
            this.currentRoom = room;
            
            // Check if user is still in the room
            const userInRoom = room.players.find(p => p.user.id === this.currentUser.id);
            
            if (userInRoom) {
                if (gameState === 'lobby') {
                    this.showLobby();
                } else if (gameState === 'playing') {
                    this.showGame();
                } else {
                    this.showMainMenu();
                }
            } else {
                // User is no longer in the room, go to menu
                this.clearGameState();
                this.showMainMenu();
            }
        } catch (error) {
            console.log('Could not restore game state:', error);
            this.clearGameState();
            this.showMainMenu();
        }
    }
    
    saveGameState() {
        if (this.currentRoom) {
            localStorage.setItem('currentRoomId', this.currentRoom.id);
            localStorage.setItem('gameState', this.gameState);
        }
    }
    
    clearGameState() {
        localStorage.removeItem('currentRoomId');
        localStorage.removeItem('gameState');
        this.currentRoom = null;
        this.gameState = 'menu';
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
        
        // Save state
        this.saveGameState();
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
                if (this.currentRoom && (this.gameState === 'lobby' || this.gameState === 'playing')) {
                    // If in a room, go to lobby
                    this.showLobby();
                } else if (this.authManager && this.authManager.isAuthenticated()) {
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
        
        // Handle page refresh/unload
        window.addEventListener('beforeunload', () => {
            if (this.currentRoom) {
                this.saveGameState();
            }
        });
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
        this.clearGameState();
        this.showScreen('authScreen');
        this.switchTab('login');
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
            // Leave room if in one
            if (this.currentRoom) {
                await this.leaveRoom(true); // Silent leave
            }
            
            await this.authManager.logout();
            this.currentUser = null;
            this.currentRoom = null;
            this.stopPolling();
            this.clearGameState();
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
        this.clearGameState();
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
        this.gameState = 'creating';
        this.showScreen('createRoomScreen');
    }
    
    showJoinRoom() {
        console.log('Showing join room screen');
        this.gameState = 'joining';
        this.showScreen('joinRoomScreen');
        this.loadAvailableRooms();
    }
    
    showJoinByCode() {
        console.log('Showing join by code screen');
        this.gameState = 'joining';
        this.showScreen('joinByCodeScreen');
    }
    
    showProfile() {
        console.log('Showing profile screen');
        this.gameState = 'profile';
        this.showScreen('profileScreen');
        this.loadProfileData();
    }
    
    showLeaderboard() {
        console.log('Showing leaderboard screen');
        this.gameState = 'leaderboard';
        this.showScreen('leaderboardScreen');
        this.loadLeaderboard();
    }
    
    showLobby() {
        console.log('Showing lobby screen');
        this.gameState = 'lobby';
        this.showScreen('lobbyScreen');
        this.updateLobbyUI();
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
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            console.log('Creating room with data:', roomData);
            const createdRoom = await this.apiCall('/rooms/create/', 'POST', roomData);
            console.log('Room created:', createdRoom);
            
            // Load full room data with all players
            console.log('Loading complete room data...');
            this.currentRoom = await this.apiCall(`/rooms/${createdRoom.id}/`);
            console.log('Complete room data loaded:', this.currentRoom);
            
            this.showNotification('Room created successfully!', 'success');
            this.showLobby();
        } catch (error) {
            console.error('Room creation failed:', error);
            let errorMessage = 'Failed to create room';
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data) {
                errorMessage = JSON.stringify(error.response.data);
            }
            this.showNotification(errorMessage, 'error');
        } finally {
            this.hideLoading(submitBtn, 'Create Room');
        }
    }
    
    async handleJoinRoom(e) {
        e.preventDefault();
        console.log('Joining room...');
        
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            this.showNotification('Please log in to join a room', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        const roomId = formData.get('roomId');
        const nickname = formData.get('nickname');
        const password = formData.get('password') || '';
        
        if (!roomId) {
            this.showNotification('Please select a room first', 'error');
            return;
        }
        
        const joinData = {
            nickname: nickname
        };
        
        // Only include password if it's provided (for private rooms)
        if (password) {
            joinData.password = password;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            const player = await this.apiCall(`/rooms/${roomId}/join/`, 'POST', joinData);
            
            // Load full room data
            this.currentRoom = await this.apiCall(`/rooms/${roomId}/`);
            
            this.showNotification('Joined room successfully!', 'success');
            this.showLobby();
        } catch (error) {
            console.error('Join room failed:', error);
            const errorMessage = error.response?.data?.error || 'Failed to join room. Please try again.';
            this.showNotification(errorMessage, 'error');
        } finally {
            this.hideLoading(submitBtn, 'Join Selected Room');
        }
    }
    
    async handleJoinByCode(e) {
        e.preventDefault();
        console.log('Joining room by code...');
        
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            this.showNotification('Please log in to join a room', 'error');
            return;
        }
        
        const formData = new FormData(e.target);
        const roomCode = formData.get('roomCode').toUpperCase();
        const nickname = formData.get('nickname');
        const password = formData.get('password') || '';
        
        const joinData = {
            room_code: roomCode,
            nickname: nickname
        };
        
        // Only include password if it's provided
        if (password) {
            joinData.password = password;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);
        
        try {
            const response = await this.apiCall('/rooms/join-by-code/', 'POST', joinData);
            // Fetch full room details to ensure player objects include nested user info
            if (response && response.room && response.room.id) {
                this.currentRoom = await this.apiCall(`/rooms/${response.room.id}/`);
            } else {
                // Fallback in case response shape changes
                this.currentRoom = response.room || null;
            }
            this.showNotification('Joined room successfully!', 'success');
            this.showLobby();
        } catch (error) {
            console.error('Join by code failed:', error);
            const errorMessage = error.response?.data?.error || 'Failed to join room. Please try again.';
            this.showNotification(errorMessage, 'error');
        } finally {
            this.hideLoading(submitBtn, 'Join Room');
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
                 onclick="game.selectRoom('${room.id}', ${room.is_private}, ${room.has_password})">
                <div class="room-header">
                    <h4>${room.name} ${room.is_private ? '🔒' : '🌐'}</h4>
                    <span class="room-status ${room.status}">${room.status}</span>
                </div>
                <div class="room-info">
                    <p>Players: ${room.player_count}/${room.max_players}</p>
                    <p>Rounds: ${room.total_rounds}</p>
                    <p>Host: ${room.host.username}</p>
                    ${room.is_private ? '<p class="text-warning">🔒 Private Room</p>' : ''}
                </div>
            </div>
        `).join('');
    }
    
    selectRoom(roomId, isPrivate = false, hasPassword = false) {
        document.getElementById('selectedRoomId').value = roomId;
        
        // Show/hide password field based on room privacy and password
        const passwordGroup = document.getElementById('joinPasswordGroup');
        if (passwordGroup) {
            passwordGroup.style.display = (isPrivate && hasPassword) ? 'block' : 'none';
        }
        
        // Highlight selected room
        document.querySelectorAll('.room-card').forEach(card => {
            card.classList.remove('selected');
        });
        event.target.closest('.room-card').classList.add('selected');
    }
    
    updateLobbyUI() {
        if (!this.currentRoom) return;
        
        console.log('Updating lobby UI with room:', this.currentRoom);
        
        // Update room info
        const roomNameEl = document.getElementById('lobbyRoomName');
        const roomCodeEl = document.getElementById('lobbyRoomCode');
        const playerCountEl = document.getElementById('lobbyPlayerCount');
        
        if (roomNameEl) roomNameEl.textContent = this.currentRoom.name;
        if (roomCodeEl) roomCodeEl.textContent = this.currentRoom.room_code;
        if (playerCountEl) playerCountEl.textContent = `${this.currentRoom.player_count}/${this.currentRoom.max_players}`;
        
        // Update players list
        this.updatePlayersDisplay();
        
        // Update room settings display
        this.updateRoomSettingsDisplay();
        
        // Update buttons based on user role and room state
        this.updateLobbyButtons();
    }
    
    updatePlayersDisplay() {
        const playersContainer = document.getElementById('lobbyPlayers');
        if (!playersContainer || !this.currentRoom) return;
        
        const currentUser = this.authManager.user;
        
        playersContainer.innerHTML = this.currentRoom.players.map(player => {
            const avatarKey = (player.user?.profile?.avatar) || player.avatar || 'detective_1';
            return `
            <div class="player-card ${player.is_connected ? 'connected' : 'disconnected'}">
                <div class="player-avatar">${this.authManager.getAvatarEmoji(avatarKey)}</div>
                <div class="player-info">
                    <div class="player-name">
                        ${player.nickname}
                        ${player.is_host ? '👑' : ''}
                        ${String(player.user?.id) === String(currentUser?.id) ? ' (You)' : ''}
                    </div>
                    <div class="player-status">
                        ${player.is_ready ? '✅ Ready' : '⏳ Not Ready'}
                        ${player.is_connected ? '' : ' - Disconnected'}
                    </div>
                </div>
            </div>
        `}).join('');
    }
    
    updateRoomSettingsDisplay() {
        const settingsContainer = document.getElementById('roomSettingsDisplay');
        if (!settingsContainer || !this.currentRoom) return;
        
        settingsContainer.innerHTML = `
            <div class="settings-grid">
                <div class="setting-item">
                    <strong>Max Players:</strong> ${this.currentRoom.max_players}
                </div>
                <div class="setting-item">
                    <strong>Total Rounds:</strong> ${this.currentRoom.total_rounds}
                </div>
                <div class="setting-item">
                    <strong>Difficulty:</strong> ${this.currentRoom.difficulty_level}
                </div>
                <div class="setting-item">
                    <strong>Discussion Time:</strong> ${this.currentRoom.discussion_time}s
                </div>
                <div class="setting-item">
                    <strong>Voting Time:</strong> ${this.currentRoom.voting_time}s
                </div>
                <div class="setting-item">
                    <strong>Room Type:</strong> ${this.currentRoom.is_private ? 'Private' : 'Public'}
                </div>
            </div>
        `;
    }
    
    updateLobbyButtons() {
        const readyBtn = document.getElementById('toggleReadyBtn');
        const startBtn = document.getElementById('startGameBtn');
        const statusEl = document.getElementById('lobbyStatus');
        
        if (!this.currentRoom) {
            console.warn('Room data not available for button updates');
            return;
        }
        
        // Initialize players array if not present
        if (!this.currentRoom.players) {
            this.currentRoom.players = [];
        }
        
        const currentUser = this.authManager?.user;
        if (!currentUser) {
            console.warn('Current user not available');
            return;
        }
        
        // Resolve current player; fallback by nickname if necessary
        let currentPlayer = this.currentRoom.players.find(p => p.user?.id != null && String(p.user.id) === String(currentUser?.id));
        if (!currentPlayer) {
            currentPlayer = this.currentRoom.players.find(p => p.nickname && p.nickname === currentUser.username);
        }
        // Host detection: use player.is_host OR room.host.id
        const isHost = (currentPlayer?.is_host === true) || (this.currentRoom.host?.id != null && String(this.currentRoom.host.id) === String(currentUser.id));
        
        // Update ready button
        if (readyBtn) {
            if (currentPlayer) {
                readyBtn.textContent = currentPlayer.is_ready ? 'Not Ready' : 'Ready';
                readyBtn.className = `btn ${currentPlayer.is_ready ? 'btn-warning' : 'btn-success'}`;
                readyBtn.disabled = false;
            } else {
                // Fallback: allow user to press Ready even if currentPlayer not yet resolved
                readyBtn.disabled = false;
                readyBtn.textContent = 'Ready';
                readyBtn.className = 'btn btn-success';
            }
        }
        
        // Update start button - Always show for host, enable/disable based on conditions
        if (startBtn) {
            if (isHost) {
                // Always show for host
                startBtn.classList.remove('hidden');
                startBtn.style.display = 'inline-block';
                
                // Check if game can start
                const connectedPlayers = this.currentRoom.players.filter(p => p.is_connected);
                const readyPlayers = connectedPlayers.filter(p => p.is_ready);
                const hasMinPlayers = connectedPlayers.length >= (this.currentRoom.min_players || 3);
                // Per request: enable start when min players reached (not requiring all ready)
                const canStart = hasMinPlayers;
                
                if (canStart) {
                    startBtn.disabled = false;
                    startBtn.textContent = 'Start Game';
                    startBtn.className = 'btn btn-success';
                    startBtn.style.opacity = '1';
                } else {
                    startBtn.disabled = true;
                    startBtn.textContent = `Start Game (min ${this.currentRoom.min_players || 3} players)`;
                    startBtn.className = 'btn btn-success';
                    startBtn.style.opacity = '0.6';
                }
            } else {
                // Hide for non-hosts
                startBtn.classList.add('hidden');
                startBtn.style.display = 'none';
            }
        }
        
        // Update status
        if (statusEl) {
            try {
                const connectedPlayers = this.currentRoom.players.filter(p => p.is_connected);
                const readyPlayers = connectedPlayers.filter(p => p.is_ready);
                const minPlayers = this.currentRoom.min_players || 3;
                const hasMinPlayers = connectedPlayers.length >= minPlayers;
                const allReady = connectedPlayers.length === readyPlayers.length && connectedPlayers.length > 0;
                
                if (connectedPlayers.length === 0) {
                    statusEl.innerHTML = `
                        <p class="mb-2" style="color: var(--warning-color);">⏳ Loading players...</p>
                        <p><small>Please wait while room data loads</small></p>
                    `;
                } else if (hasMinPlayers && allReady) {
                    statusEl.innerHTML = `
                        <p class="mb-2" style="color: var(--success-color);">✅ Ready to start!</p>
                        <p><small>All players are ready. Host can start the game.</small></p>
                    `;
                } else if (!hasMinPlayers) {
                    statusEl.innerHTML = `
                        <p class="mb-2" style="color: var(--warning-color);">⏳ Need more players...</p>
                        <p><small>Need at least ${minPlayers} players (currently ${connectedPlayers.length})</small></p>
                    `;
                } else {
                    statusEl.innerHTML = `
                        <p class="mb-2" style="color: var(--warning-color);">⏳ Waiting for players to be ready...</p>
                        <p><small>${readyPlayers.length}/${connectedPlayers.length} players ready</small></p>
                    `;
                }
            } catch (error) {
                console.error('Error updating status:', error);
                statusEl.innerHTML = `
                    <p class="mb-2">Loading room status...</p>
                `;
            }
        }
    }
    
    async leaveRoom(silent = false) {
        if (!this.currentRoom) {
            if (!silent) this.showMainMenu();
            return;
        }
        
        try {
            await this.apiCall(`/rooms/${this.currentRoom.id}/leave/`, 'POST');
            if (!silent) {
                this.showNotification('Left room successfully', 'success');
            }
        } catch (error) {
            console.error('Leave room failed:', error);
            if (!silent) {
                this.showNotification('Failed to leave room', 'error');
            }
        } finally {
            this.currentRoom = null;
            this.stopPolling();
            this.clearGameState();
            if (!silent) {
                this.showMainMenu();
            }
        }
    }
    
    async toggleReady() {
        if (!this.currentRoom) return;
        
        try {
            const response = await this.apiCall(`/rooms/${this.currentRoom.id}/toggle-ready/`, 'POST');
            this.showNotification(response.message, 'success');
            
            // Refresh room data
            this.currentRoom = await this.apiCall(`/rooms/${this.currentRoom.id}/`);
            this.updateLobbyUI();
        } catch (error) {
            console.error('Toggle ready failed:', error);
            this.showNotification('Failed to update ready status', 'error');
        }
    }
    
    async startGame() {
        if (!this.currentRoom) return;
        
        try {
            await this.apiCall(`/rooms/${this.currentRoom.id}/start/`, 'POST');
            this.showNotification('Game started!', 'success');
            this.showGame();
        } catch (error) {
            console.error('Start game failed:', error);
            this.showNotification('Failed to start game', 'error');
        }
    }
    
    // Polling Methods
    startPolling() {
        this.stopPolling();
        this.pollInterval = setInterval(() => {
            this.pollForUpdates();
        }, 3000); // Poll every 3 seconds
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
        if (!this.currentRoom) {
            this.stopPolling();
            return;
        }
        
        try {
            // Get updated room data
            const updatedRoom = await this.apiCall(`/rooms/${this.currentRoom.id}/`);
            
            // Check if room status changed
            if (updatedRoom.status !== this.currentRoom.status) {
                if (updatedRoom.status === 'in_progress' && this.gameState === 'lobby') {
                    this.showNotification('Game has started!', 'success');
                    this.showGame();
                } else if (updatedRoom.status === 'finished') {
                    this.showNotification('Game has ended', 'info');
                    this.showMainMenu();
                    return;
                }
            }
            
            this.currentRoom = updatedRoom;
            
            // Update UI based on current state
            if (this.gameState === 'lobby') {
                this.updateLobbyUI();
            } else if (this.gameState === 'playing') {
                this.updateGameUI();
            }
        } catch (error) {
            console.error('Polling failed:', error);
            // If room not found, user might have been kicked or room deleted
            if (error.response?.status === 404) {
                this.showNotification('Room no longer exists', 'warning');
                this.showMainMenu();
            }
        }
    }
    
    async updateGameUI() {
        if (!this.currentRoom) {
            console.warn('No current room for game UI update');
            return;
        }
        
        try {
            const roundData = await this.apiCall(`/rooms/${this.currentRoom.id}/round/`);
            this.currentRound = roundData;
            
            // Update round info
            const roundNumberEl = document.getElementById('currentRoundNumber');
            const totalRoundsEl = document.getElementById('totalRounds');
            if (roundNumberEl) roundNumberEl.textContent = roundData.round_number;
            if (totalRoundsEl) totalRoundsEl.textContent = this.currentRoom.total_rounds;
            
            // Update role indicator
            const roleIndicator = document.getElementById('roleIndicator');
            if (roleIndicator) {
                roleIndicator.textContent = roundData.is_imposter ? 'You are the Imposter!' : 'You are a Detective!';
                roleIndicator.className = `role-indicator ${roundData.is_imposter ? 'imposter' : 'detective'}`;
            }
            
            // Update question display
            const questionTextEl = document.getElementById('questionText');
            const questionCategoryEl = document.getElementById('questionCategory');
            const questionHintEl = document.getElementById('questionHint');
            
            // Prefer player-specific question; fallback to round-level question/decoy
            const pq = roundData.player_question;
            const fallbackQ = roundData.is_imposter ? (roundData.decoy_question || roundData.question) : (roundData.question || roundData.decoy_question);
            const q = pq || fallbackQ;
            if (q) {
                if (questionTextEl) questionTextEl.textContent = q.text || '...';
                if (questionCategoryEl) questionCategoryEl.textContent = q.category || (roundData.is_imposter ? 'Decoy' : (roundData.question?.category || ''));
                if (questionHintEl) {
                    const hint = q.hint || '';
                    questionHintEl.textContent = hint;
                    questionHintEl.style.display = hint ? 'block' : 'none';
                }
            }
            
            // Update phase display based on round status
            const phaseTitleEl = document.getElementById('phaseTitle');
            const phaseDescriptionEl = document.getElementById('phaseDescription');
            
            if (phaseTitleEl && phaseDescriptionEl) {
                switch (roundData.status) {
                    case 'answering':
                        phaseTitleEl.textContent = 'Answering Phase';
                        phaseDescriptionEl.textContent = 'Submit your numerical answer below';
                        this.showAnswerSection();
                        break;
                    case 'discussion':
                        phaseTitleEl.textContent = 'Discussion Phase';
                        phaseDescriptionEl.textContent = 'Discuss the answers with other players!';
                        this.showDiscussionSection(roundData);
                        break;
                    case 'voting':
                        phaseTitleEl.textContent = 'Voting Phase';
                        phaseDescriptionEl.textContent = 'Vote for the player you think is the imposter';
                        this.showVotingSection(roundData);
                        break;
                    case 'results':
                        phaseTitleEl.textContent = 'Round Results';
                        phaseDescriptionEl.textContent = 'See who was the imposter and how everyone performed';
                        this.showResultsSection(roundData);
                        break;
                    default:
                        phaseTitleEl.textContent = 'Loading...';
                        phaseDescriptionEl.textContent = 'Please wait while the round loads';
                }
            }
        } catch (error) {
            console.error('Failed to update game UI:', error);
            this.showNotification('Failed to load round data', 'error');
        }
    }
    
    showAnswerSection() {
        const answerSection = document.getElementById('answerSection');
        const discussionSection = document.getElementById('discussionSection');
        const votingSection = document.getElementById('votingSection');
        const resultsSection = document.getElementById('resultsSection');
        
        // Hide all other sections
        [discussionSection, votingSection, resultsSection].forEach(section => {
            if (section) section.classList.add('hidden');
        });
        
        // Show answer section
        if (answerSection) {
            answerSection.classList.remove('hidden');
            const answerForm = answerSection.querySelector('#answerForm');
            if (answerForm) {
                answerForm.onsubmit = (e) => this.handleSubmitAnswer(e);
            }
        }
    }
    
    showDiscussionSection(roundData) {
        const discussionSection = document.getElementById('discussionSection');
        const answerSection = document.getElementById('answerSection');
        const votingSection = document.getElementById('votingSection');
        const resultsSection = document.getElementById('resultsSection');
        
        // Hide all other sections
        [answerSection, votingSection, resultsSection].forEach(section => {
            if (section) section.classList.add('hidden');
        });
        
        // Show discussion section
        if (discussionSection) {
            discussionSection.classList.remove('hidden');
            this.updateAnswersDisplay(roundData);
        }
    }
    
    showVotingSection(roundData) {
        const votingSection = document.getElementById('votingSection');
        const answerSection = document.getElementById('answerSection');
        const discussionSection = document.getElementById('discussionSection');
        const resultsSection = document.getElementById('resultsSection');
        
        // Hide all other sections
        [answerSection, discussionSection, resultsSection].forEach(section => {
            if (section) section.classList.add('hidden');
        });
        
        // Show voting section
        if (votingSection) {
            votingSection.classList.remove('hidden');
            this.updateVotingDisplay(roundData);
        }
    }
    
    showResultsSection(roundData) {
        const resultsSection = document.getElementById('resultsSection');
        const answerSection = document.getElementById('answerSection');
        const discussionSection = document.getElementById('discussionSection');
        const votingSection = document.getElementById('votingSection');
        
        // Hide all other sections
        [answerSection, discussionSection, votingSection].forEach(section => {
            if (section) section.classList.add('hidden');
        });
        
        // Show results section
        if (resultsSection) {
            resultsSection.classList.remove('hidden');
            this.updateResultsDisplay(roundData);
        }
    }
    
    updateAnswersDisplay(roundData) {
        const answersContainer = document.getElementById('answersDisplay');
        if (!answersContainer) return;
        
        if (!roundData.answers || roundData.answers.length === 0) {
            answersContainer.innerHTML = '<p>No answers submitted yet</p>';
            return;
        }
        
        answersContainer.innerHTML = roundData.answers.map(answer => `
            <div class="answer-item">
                <strong>${answer.player.nickname}</strong>: ${answer.answer}
                ${answer.is_imposter_answer ? ' (Imposter Answer)' : ''}
            </div>
        `).join('');
    }
    
    updateVotingDisplay(roundData) {
        const votingContainer = document.getElementById('votingOptions');
        if (!votingContainer) return;
        
        if (!roundData.players || roundData.players.length === 0) {
            votingContainer.innerHTML = '<p>No players available for voting</p>';
            return;
        }
        
        votingContainer.innerHTML = roundData.players.map(player => `
            <div class="vote-option" onclick="game.submitVote('${player.id}')">
                <div class="player-avatar">${this.authManager.getAvatarEmoji(player.avatar)}</div>
                <div class="player-name">${player.nickname}</div>
            </div>
        `).join('');
    }
    
    updateResultsDisplay(roundData) {
        const resultsContainer = document.getElementById('roundResults');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = `
            <div class="result-item">
                <strong>Imposter:</strong> ${roundData.imposter?.nickname || 'Unknown'}
            </div>
            <div class="result-item">
                <strong>Correct Answer:</strong> ${roundData.question?.correct_answer || 'Unknown'}
            </div>
            <div class="result-item">
                <strong>Imposter Answer:</strong> ${roundData.decoy_question?.correct_answer || 'Unknown'}
            </div>
        `;
    }
    
    async handleSubmitAnswer(e) {
        e.preventDefault();
        if (!this.currentRoom || !this.currentRound) return;
        
        const answerInput = document.getElementById('answerInput');
        if (!answerInput || !answerInput.value) {
            this.showNotification('Please enter an answer', 'error');
            return;
        }
        
        const answerData = {
            answer: parseInt(answerInput.value)
        };
        
        try {
            await this.apiCall(`/rooms/${this.currentRoom.id}/round/${this.currentRound.round_number}/submit-answer/`, 'POST', answerData);
            answerInput.value = '';
            this.showNotification('Answer submitted successfully!', 'success');
            
            // Update the game UI to reflect the new phase
            await this.updateGameUI();
        } catch (error) {
            console.error('Submit answer failed:', error);
            const errorMessage = error.response?.data?.error || 'Failed to submit answer';
            this.showNotification(errorMessage, 'error');
        }
    }
    
    async selectVote(playerId) {
        if (!this.currentRoom || !this.currentRound) return;
        
        const voteData = {
            accused_player_id: parseInt(playerId)
        };
        
        try {
            await this.apiCall(`/rooms/${this.currentRoom.id}/round/${this.currentRound.round_number}/vote/`, 'POST', voteData);
            this.showNotification('Vote submitted successfully!', 'success');
            
            // Update the game UI to reflect the new phase
            await this.updateGameUI();
        } catch (error) {
            console.error('Submit vote failed:', error);
            const errorMessage = error.response?.data?.error || 'Failed to submit vote';
            this.showNotification(errorMessage, 'error');
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
        
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
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
        }, 4000);
    }
    
    // Placeholder methods for future implementation
    async loadProfileData() {
        console.log('Loading profile data...');
        if (!this.authManager || !this.authManager.isAuthenticated()) return;
        
        try {
            const profile = await this.authManager.getProfile();
            const statsResponse = await this.apiCall('/profile/statistics/');
            
            this.displayProfileData(profile, statsResponse);
        } catch (error) {
            console.error('Failed to load profile data:', error);
            this.showNotification('Failed to load profile data', 'error');
        }
    }
    
    displayProfileData(profile, stats) {
        const profileContainer = document.getElementById('profileContainer');
        if (!profileContainer) return;
        
        profileContainer.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">
                    ${this.authManager.getAvatarEmoji(profile.avatar)}
                </div>
                <div class="profile-info">
                    <h2>${profile.user.username}</h2>
                    <p>${profile.bio || 'No bio available'}</p>
                    <div class="profile-stats">
                        <span class="stat">Level: ${profile.experience_level}</span>
                        <span class="stat">Rank: #${profile.rank}</span>
                        <span class="stat">Score: ${profile.total_score}</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-detailed-stats">
                <h3>Detailed Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h4>Games</h4>
                        <p>Total: ${profile.total_games}</p>
                        <p>Won: ${profile.total_wins}</p>
                        <p>Win Rate: ${profile.win_rate.toFixed(1)}%</p>
                    </div>
                    <div class="stat-card">
                        <h4>As Detective</h4>
                        <p>Wins: ${profile.total_detective_wins}</p>
                        <p>Win Rate: ${profile.detective_win_rate.toFixed(1)}%</p>
                    </div>
                    <div class="stat-card">
                        <h4>As Imposter</h4>
                        <p>Wins: ${profile.total_imposter_wins}</p>
                        <p>Win Rate: ${profile.imposter_win_rate.toFixed(1)}%</p>
                    </div>
                    <div class="stat-card">
                        <h4>Streaks</h4>
                        <p>Current: ${profile.consecutive_wins}</p>
                        <p>Best: ${profile.best_win_streak}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadLeaderboard() {
        console.log('Loading leaderboard...');
        
        try {
            const leaderboard = await this.apiCall('/leaderboard/?type=score');
            this.displayLeaderboard(leaderboard.leaderboard, 'score');
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.showNotification('Failed to load leaderboard', 'error');
        }
    }
    
    displayLeaderboard(leaderboard, type) {
        const container = document.getElementById('leaderboardContainer');
        if (!container) return;
        
        container.innerHTML = `
            <div class="leaderboard-list">
                ${leaderboard.map((profile, index) => `
                    <div class="leaderboard-item ${profile.user.id === this.currentUser?.id ? 'current-user' : ''}">
                        <div class="rank">#${index + 1}</div>
                        <div class="player-info">
                            <span class="avatar">${this.authManager.getAvatarEmoji(profile.avatar)}</span>
                            <span class="username">${profile.user.username}</span>
                            <span class="level">${profile.experience_level}</span>
                        </div>
                        <div class="stats">
                            <span class="primary-stat">${type === 'score' ? profile.total_score : type === 'wins' ? profile.total_wins : profile.win_rate.toFixed(1) + '%'}</span>
                            <span class="secondary-stat">${profile.total_games} games</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Setup leaderboard tabs
        document.querySelectorAll('[data-leaderboard]').forEach(tab => {
            tab.addEventListener('click', async (e) => {
                const newType = e.target.getAttribute('data-leaderboard');
                
                // Update active tab
                document.querySelectorAll('[data-leaderboard]').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // Load new leaderboard data
                try {
                    const newLeaderboard = await this.apiCall(`/leaderboard/?type=${newType}`);
                    this.displayLeaderboard(newLeaderboard.leaderboard, newType);
                } catch (error) {
                    console.error('Failed to load leaderboard:', error);
                    this.showNotification('Failed to load leaderboard', 'error');
                }
            });
        });
    }
    
    async handleUpdateProfile(e) {
        e.preventDefault();
        console.log('Updating profile...');
        
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
            this.showNotification('Profile updated successfully!', 'success');
            this.loadProfileData(); // Refresh profile display
        } catch (error) {
            console.error('Profile update failed:', error);
            this.showNotification('Failed to update profile', 'error');
        } finally {
            this.hideLoading(submitBtn, 'Update Profile');
        }
    }
    
    async handleSubmitAnswer(e) {
        e.preventDefault();
        if (!this.currentRoom || !this.currentRound) return;
        
        const answerInput = document.getElementById('answerInput');
        if (!answerInput || !answerInput.value) {
            this.showNotification('Please enter an answer', 'error');
            return;
        }
        
        const answerData = {
            answer: parseInt(answerInput.value)
        };
        
        try {
            await this.apiCall(`/rooms/${this.currentRoom.id}/round/${this.currentRound.round_number}/submit-answer/`, 'POST', answerData);
            answerInput.value = '';
            this.showNotification('Answer submitted successfully!', 'success');
            
            // Update the game UI to reflect the new phase
            await this.updateGameUI();
        } catch (error) {
            console.error('Submit answer failed:', error);
            const errorMessage = error.response?.data?.error || 'Failed to submit answer';
            this.showNotification(errorMessage, 'error');
        }
    }
    
    async startVoting() {
        if (!this.currentRoom || !this.currentRound) return;
        
        try {
            await this.apiCall(`/rooms/${this.currentRoom.id}/round/${this.currentRound.round_number}/start-voting/`, 'POST');
            this.showNotification('Voting phase started!', 'success');
            
            // Update the game UI to reflect the new phase
            await this.updateGameUI();
        } catch (error) {
            console.error('Start voting failed:', error);
            const errorMessage = error.response?.data?.error || 'Failed to start voting';
            this.showNotification(errorMessage, 'error');
        }
    }
    
    async submitVote(accusedPlayerId) {
        if (!this.currentRoom || !this.currentRound) return;
        
        const voteData = {
            accused_player_id: parseInt(accusedPlayerId)
        };
        
        try {
            await this.apiCall(`/rooms/${this.currentRoom.id}/round/${this.currentRound.round_number}/vote/`, 'POST', voteData);
            this.showNotification('Vote submitted successfully!', 'success');
            
            // Update the game UI to reflect the new phase
            await this.updateGameUI();
        } catch (error) {
            console.error('Submit vote failed:', error);
            const errorMessage = error.response?.data?.error || 'Failed to submit vote';
            this.showNotification(errorMessage, 'error');
        }
    }
    
    async continueToNextRound() { 
        if (!this.currentRoom) return;
        
        try {
            // Call the backend to advance to the next round
            const response = await this.apiCall(`/rooms/${this.currentRoom.id}/next-round/`, 'POST');
            
            if (response.next_round) {
                // Update UI for the new round
                await this.updateGameUI();
                this.showNotification(`Round ${response.next_round} started!`, 'success');
            } else {
                // Game has ended
                this.showMainMenu();
                this.showNotification('Game has ended!', 'info');
            }
        } catch (error) {
            console.error('Failed to continue to next round:', error);
            const errorMessage = error.response?.data?.error || 'Failed to advance to next round';
            this.showNotification(errorMessage, 'error');
        }
    }
}

// Initialize the game when the script loads
console.log('Number Hunt Game script loaded');

// Wait for DOM and auth manager to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    // Wait a bit for auth manager to be ready
    setTimeout(() => {
        window.game = new NumberHuntGame();
        console.log('Game initialized and ready!');
    }, 100);
});