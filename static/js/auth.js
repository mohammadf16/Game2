// static/js/auth.js - Authentication functionality

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('userData') || 'null');
        this.profile = JSON.parse(localStorage.getItem('userProfile') || 'null');
        this.apiBaseUrl = '/api';
        
        this.setupAxiosInterceptors();
    }
    
    setupAxiosInterceptors() {
        // Add token to all requests
        const self = this;
        if (typeof axios !== 'undefined') {
            axios.defaults.baseURL = this.apiBaseUrl;
            axios.interceptors.request.use(function (config) {
                if (self.token) {
                    config.headers.Authorization = `Token ${self.token}`;
                }
                return config;
            });
            
            // Handle 401 responses
            axios.interceptors.response.use(
                response => response,
                error => {
                    if (error.response?.status === 401) {
                        self.logout();
                        window.location.reload();
                    }
                    return Promise.reject(error);
                }
            );
        }
    }
    
    async register(userData) {
        try {
            const response = await this.apiCall('/auth/register/', 'POST', userData);
            if (response.success) {
                this.setAuthData(response.token, response.user, response.profile);
                return { success: true, data: response };
            }
            return { success: false, errors: response.errors };
        } catch (error) {
            return { success: false, errors: { general: ['Registration failed. Please try again.'] } };
        }
    }
    
    async login(credentials) {
        try {
            const response = await this.apiCall('/auth/login/', 'POST', credentials);
            if (response.success) {
                this.setAuthData(response.token, response.user, response.profile);
                return { success: true, data: response };
            }
            return { success: false, errors: response.errors };
        } catch (error) {
            return { success: false, errors: { general: ['Login failed. Please try again.'] } };
        }
    }
    
    async logout() {
        try {
            if (this.token) {
                await this.apiCall('/auth/logout/', 'POST');
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuthData();
        }
    }
    
    setAuthData(token, user, profile) {
        this.token = token;
        this.user = user;
        this.profile = profile;
        
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('userProfile', JSON.stringify(profile));
    }
    
    clearAuthData() {
        this.token = null;
        this.user = null;
        this.profile = null;
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('userProfile');
    }
    
    isAuthenticated() {
        return !!this.token && !!this.user;
    }
    
    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `${this.apiBaseUrl}${endpoint}`;
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
        
        const response = await fetch(url, options);
        return await response.json();
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
            return { success: true, data: response };
        } catch (error) {
            return { success: false, error: error.message };
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
}

// Initialize auth manager
const authManager = new AuthManager();
