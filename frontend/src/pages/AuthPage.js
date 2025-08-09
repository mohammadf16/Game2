import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './AuthPage.css';

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { login, register, getAvatarEmoji } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({
    username_or_email: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    avatar: 'detective_1',
    gender: 'prefer_not_say'
  });

  const [errors, setErrors] = useState({});

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const result = await login(loginForm);
      
      if (result.success) {
        showNotification('Login successful!', 'success');
        navigate('/menu');
      } else {
        setErrors(result.errors);
        showNotification('Login failed. Please check your credentials.', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showNotification('Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const result = await register(registerForm);
      
      if (result.success) {
        showNotification('Registration successful! Welcome to Number Hunt!', 'success');
        navigate('/menu');
      } else {
        setErrors(result.errors);
        showNotification('Registration failed. Please check the form.', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showNotification('Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (form, field, value) => {
    if (form === 'login') {
      setLoginForm(prev => ({ ...prev, [field]: value }));
    } else {
      setRegisterForm(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const renderError = (field) => {
    if (errors[field]) {
      const errorMessage = Array.isArray(errors[field]) ? errors[field][0] : errors[field];
      return <div className="error-message">{errorMessage}</div>;
    }
    return null;
  };

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Welcome to Number Hunt</h1>
            <p>The ultimate social deduction game</p>
          </div>
          
          <div className="auth-tabs">
            <button 
              className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </button>
            <button 
              className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Sign Up
            </button>
          </div>
          
          {/* Login Tab */}
          {activeTab === 'login' && (
            <div className="tab-content">
              <form onSubmit={handleLoginSubmit} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Username or Email</label>
                  <input
                    type="text"
                    className={`form-input ${errors.username_or_email ? 'error' : ''}`}
                    value={loginForm.username_or_email}
                    onChange={(e) => handleInputChange('login', 'username_or_email', e.target.value)}
                    required
                  />
                  {renderError('username_or_email')}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    value={loginForm.password}
                    onChange={(e) => handleInputChange('login', 'password', e.target.value)}
                    required
                  />
                  {renderError('password')}
                </div>
                
                {errors.general && (
                  <div className="error-message general-error">
                    {Array.isArray(errors.general) ? errors.general[0] : errors.general}
                  </div>
                )}
                
                <button 
                  type="submit" 
                  className="btn btn-primary btn-full"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            </div>
          )}
          
          {/* Register Tab */}
          {activeTab === 'register' && (
            <div className="tab-content">
              <form onSubmit={handleRegisterSubmit} className="auth-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className={`form-input ${errors.first_name ? 'error' : ''}`}
                      value={registerForm.first_name}
                      onChange={(e) => handleInputChange('register', 'first_name', e.target.value)}
                      required
                    />
                    {renderError('first_name')}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className={`form-input ${errors.last_name ? 'error' : ''}`}
                      value={registerForm.last_name}
                      onChange={(e) => handleInputChange('register', 'last_name', e.target.value)}
                      required
                    />
                    {renderError('last_name')}
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className={`form-input ${errors.username ? 'error' : ''}`}
                    value={registerForm.username}
                    onChange={(e) => handleInputChange('register', 'username', e.target.value)}
                    required
                  />
                  {renderError('username')}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    value={registerForm.email}
                    onChange={(e) => handleInputChange('register', 'email', e.target.value)}
                    required
                  />
                  {renderError('email')}
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className={`form-input ${errors.password ? 'error' : ''}`}
                      value={registerForm.password}
                      onChange={(e) => handleInputChange('register', 'password', e.target.value)}
                      required
                    />
                    {renderError('password')}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className={`form-input ${errors.password_confirm ? 'error' : ''}`}
                      value={registerForm.password_confirm}
                      onChange={(e) => handleInputChange('register', 'password_confirm', e.target.value)}
                      required
                    />
                    {renderError('password_confirm')}
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Choose Avatar</label>
                    <select
                      className="form-input"
                      value={registerForm.avatar}
                      onChange={(e) => handleInputChange('register', 'avatar', e.target.value)}
                    >
                      <option value="detective_1">{getAvatarEmoji('detective_1')} Detective</option>
                      <option value="detective_2">{getAvatarEmoji('detective_2')} Detective</option>
                      <option value="spy_1">{getAvatarEmoji('spy_1')} Spy</option>
                      <option value="spy_2">{getAvatarEmoji('spy_2')} Agent</option>
                      <option value="agent_1">{getAvatarEmoji('agent_1')} Agent</option>
                      <option value="agent_2">{getAvatarEmoji('agent_2')} Agent</option>
                      <option value="hacker_1">{getAvatarEmoji('hacker_1')} Hacker</option>
                      <option value="hacker_2">{getAvatarEmoji('hacker_2')} Hacker</option>
                      <option value="scientist_1">{getAvatarEmoji('scientist_1')} Scientist</option>
                      <option value="scientist_2">{getAvatarEmoji('scientist_2')} Scientist</option>
                      <option value="ninja_1">{getAvatarEmoji('ninja_1')} Ninja</option>
                      <option value="robot_1">{getAvatarEmoji('robot_1')} Robot</option>
                      <option value="alien_1">{getAvatarEmoji('alien_1')} Alien</option>
                      <option value="superhero_1">{getAvatarEmoji('superhero_1')} Hero</option>
                      <option value="superhero_2">{getAvatarEmoji('superhero_2')} Heroine</option>
                      <option value="vampire_1">{getAvatarEmoji('vampire_1')} Vampire</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender (Optional)</label>
                    <select
                      className="form-input"
                      value={registerForm.gender}
                      onChange={(e) => handleInputChange('register', 'gender', e.target.value)}
                    >
                      <option value="prefer_not_say">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non_binary">Non-binary</option>
                    </select>
                  </div>
                </div>
                
                {errors.general && (
                  <div className="error-message general-error">
                    {Array.isArray(errors.general) ? errors.general[0] : errors.general}
                  </div>
                )}
                
                <button 
                  type="submit" 
                  className="btn btn-primary btn-full"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}
          
          <div className="auth-footer">
            <p>Join thousands of players in the ultimate game of deduction!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
