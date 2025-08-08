// static/js/auth.js - Complete Enhanced Version

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('userData') || 'null');
        this.profile = JSON.parse(localStorage.getItem('userProfile') || 'null');
        this.apiBaseUrl = '';
        this.isReady = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        console.log('AuthManager constructor called');
        this.initialize();
    }
    
    async initialize() {
        // Verify stored token if exists
        if (this.token && this.user) {
            const isValid = await this.verifyToken();
            if (!isValid) {
                this.clearAuthData();
            }
        }
        
        this.isReady = true;
        console.log('AuthManager ready, authenticated:', this.isAuthenticated());
    }
    
    async verifyToken() {
        try {
            const response = await fetch('/api/profile/', {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${this.token}`,
                    'Content-Type': 'application/json',
                }
            });
            return response.ok;
        } catch (error) {
            console.warn('Token verification failed:', error);
            return false;
        }
    }
    
    async register(userData) {
        console.log('AuthManager.register called with:', userData);
        
        try {
            const response = await this.makeRequest('/api/auth/register/', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            console.log('Register response:', data);
            
            if (data.success) {
                this.setAuthData(data.token, data.user, data.profile);
                this.showSuccessMessage(data.message || 'Registration successful!');
                return { success: true, data: data };
            } else {
                return { success: false, errors: data.errors || {} };
            }
        } catch (error) {
            console.error('Registration API error:', error);
            return { success: false, errors: { general: ['Registration failed. Please try again.'] } };
        }
    }
    
    async login(credentials) {
        console.log('AuthManager.login called with:', credentials);
        
        try {
            const response = await this.makeRequest('/api/auth/login/', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            console.log('Login response:', data);
            
            if (data.success) {
                this.setAuthData(data.token, data.user, data.profile);
                this.showSuccessMessage(data.message || 'Login successful!');
                return { success: true, data: data };
            } else {
                return { success: false, errors: data.errors || {} };
            }
        } catch (error) {
            console.error('Login API error:', error);
            return { success: false, errors: { general: ['Login failed. Please try again.'] } };
        }
    }
    
    async logout() {
        try {
            if (this.token) {
                await this.makeRequest('/api/auth/logout/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${this.token}`,
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuthData();
        }
    }
    
    async makeRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch(url, defaultOptions);
                
                if (response.status === 401 && this.token) {
                    this.clearAuthData();
                    throw new Error('Authentication expired');
                }
                
                return response;
            } catch (error) {
                console.warn(`Request attempt ${attempt + 1} failed:`, error);
                
                if (attempt === this.maxRetries) {
                    throw error;
                }
                
                // Wait before retry (exponential backoff)
                await this.wait(Math.pow(2, attempt) * 1000);
            }
        }
    }
    
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    setAuthData(token, user, profile) {
        this.token = token;
        this.user = user;
        this.profile = profile;
        
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('userProfile', JSON.stringify(profile));
        
        console.log('Auth data set:', { user: user.username, token: token.substring(0, 10) + '...' });
        
        // Trigger auth state change event
        this.triggerAuthStateChange();
    }
    
    clearAuthData() {
        this.token = null;
        this.user = null;
        this.profile = null;
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('userProfile');
        
        console.log('Auth data cleared');
        
        // Trigger auth state change event
        this.triggerAuthStateChange();
    }
    
    triggerAuthStateChange() {
        // Dispatch custom event for auth state changes
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: {
                isAuthenticated: this.isAuthenticated(),
                user: this.user,
                profile: this.profile
            }
        }));
    }
    
    isAuthenticated() {
        const authenticated = !!this.token && !!this.user;
        return authenticated;
    }
    
    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `/api${endpoint}`;
        console.log('API call:', method, url, data);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (this.token) {
            options.headers.Authorization = `Token ${this.token}`;
        }
        
        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await this.makeRequest(url, options);
            const responseData = await response.json();
            
            console.log('API response:', response.status, responseData);
            
            if (!response.ok) {
                console.error('API error:', response.status, responseData);
                throw new Error(responseData.message || `HTTP ${response.status}`);
            }
            
            return responseData;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }
    
    async getProfile() {
        if (!this.isAuthenticated()) return null;
        
        try {
            const profile = await this.apiCall('/profile/');
            this.profile = profile;
            localStorage.setItem('userProfile', JSON.stringify(profile));
            return profile;
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            return null;
        }
    }
    
    async updateProfile(profileData) {
        if (!this.isAuthenticated()) return { success: false };
        
        try {
            const response = await this.apiCall('/profile/', 'PUT', profileData);
            this.profile = response;
            localStorage.setItem('userProfile', JSON.stringify(response));
            this.showSuccessMessage('Profile updated successfully!');
            return { success: true, data: response };
        } catch (error) {
            console.error('Profile update failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getStatistics() {
        if (!this.isAuthenticated()) return null;
        
        try {
            return await this.apiCall('/profile/statistics/');
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
            return null;
        }
    }
    
    async getGameHistory(page = 1) {
        if (!this.isAuthenticated()) return null;
        
        try {
            return await this.apiCall(`/profile/history/?page=${page}`);
        } catch (error) {
            console.error('Failed to fetch game history:', error);
            return null;
        }
    }
    
    async getLeaderboard(type = 'score') {
        try {
            return await this.apiCall(`/leaderboard/?type=${type}`);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            return null;
        }
    }
    
    getUserStats() {
        return this.profile || {};
    }
    
    getAvatarEmoji(avatarKey) {
        const avatarMap = {
            'detective_1': '🕵️',
            'detective_2': '👨‍💼',
            'detective_3': '👩‍💼',
            'spy_1': '🕴️',
            'spy_2': '👤',
            'ninja_1': '🥷',
            'robot_1': '🤖',
            'alien_1': '👽',
            'ghost_1': '👻',
            'wizard_1': '🧙‍♂️',
            'witch_1': '🧙‍♀️',
            'pirate_1': '🏴‍☠️',
            'superhero_1': '🦸‍♂️',
            'superhero_2': '🦸‍♀️',
            'vampire_1': '🧛‍♂️',
        };
        return avatarMap[avatarKey] || '🕵️';
    }
    
    getAvatarName(avatarKey) {
        const avatarNames = {
            'detective_1': 'Detective Classic',
            'detective_2': 'Business Detective',
            'detective_3': 'Lady Detective',
            'spy_1': 'Secret Agent',
            'spy_2': 'Mysterious Figure',
            'ninja_1': 'Ninja',
            'robot_1': 'Android',
            'alien_1': 'Alien',
            'ghost_1': 'Ghost',
            'wizard_1': 'Wizard',
            'witch_1': 'Witch',
            'pirate_1': 'Pirate',
            'superhero_1': 'Hero',
            'superhero_2': 'Heroine',
            'vampire_1': 'Vampire',
        };
        return avatarNames[avatarKey] || 'Detective';
    }
    
    showSuccessMessage(message) {
        console.log('Success:', message);
        // You can implement a notification system here
        this.showNotification(message, 'success');
    }
    
    showErrorMessage(message) {
        console.error('Error:', message);
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 1001;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Token refresh functionality
    async refreshToken() {
        if (!this.token) return false;
        
        try {
            const response = await this.makeRequest('/api/auth/refresh-token/', {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${this.token}`,
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                localStorage.setItem('authToken', data.token);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
        
        return false;
    }
    
    // Auto-refresh token before expiry
    startTokenRefreshTimer() {
        // Refresh token every 6 days (before 7-day expiry)
        const refreshInterval = 6 * 24 * 60 * 60 * 1000; // 6 days in milliseconds
        
        setInterval(async () => {
            if (this.isAuthenticated()) {
                await this.refreshToken();
            }
        }, refreshInterval);
    }
}

// Initialize auth manager immediately
console.log('Initializing AuthManager...');
window.authManager = new AuthManager();
console.log('AuthManager initialized and available globally');

// Start token refresh timer if authenticated
if (window.authManager.isAuthenticated()) {
    window.authManager.startTokenRefreshTimer();
}