import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, profile, logout, getAvatarEmoji } = useAuth();
  const { showNotification } = useNotification();

  const handleLogout = async () => {
    try {
      await logout();
      showNotification('Logged out successfully', 'success');
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      showNotification('Logout failed', 'error');
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <h1>🎯 NUMBER HUNT</h1>
        </div>
        
        <div className="nav-content">
          {user ? (
            <div className="user-info">
              <div className="user-display">
                <span className="user-avatar">
                  {getAvatarEmoji(profile?.avatar || 'detective_1')}
                </span>
                <span className="user-name">{user.username}</span>
                <span className="user-score">{profile?.total_score || 0} pts</span>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/auth')}
              >
                Login
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/auth')}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
