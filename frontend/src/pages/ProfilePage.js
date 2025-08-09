import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, getAvatarEmoji } = useAuth();
  const { apiCall } = useGame();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(false);

  const [profileForm, setProfileForm] = useState({
    avatar: profile?.avatar || 'detective_1',
    preferred_category: profile?.preferred_category || 'mixed',
    bio: profile?.bio || ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadProfileStats();
  }, []);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        avatar: profile.avatar || 'detective_1',
        preferred_category: profile.preferred_category || 'mixed',
        bio: profile.bio || ''
      });
    }
  }, [profile]);

  const loadProfileStats = async () => {
    try {
      const statsData = await apiCall('/profile/statistics/');
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load profile stats:', error);
      showNotification('Failed to load profile statistics', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      await updateProfile(profileForm);
      showNotification('Profile updated successfully!', 'success');
      setEditing(false);
    } catch (error) {
      console.error('Profile update failed:', error);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
      
      showNotification('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderError = (field) => {
    if (errors[field]) {
      const errorMessage = Array.isArray(errors[field]) ? errors[field][0] : errors[field];
      return <div className="error-message">{errorMessage}</div>;
    }
    return null;
  };

  if (statsLoading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="page-header">
          <h1>Your Profile</h1>
          <p>Manage your account and view your game statistics</p>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/menu')}
          >
            ← Back to Menu
          </button>
        </div>

        <div className="profile-content">
          <div className="profile-main">
            {/* Profile Header */}
            <div className="profile-header">
              <div className="profile-avatar-large">
                {getAvatarEmoji(profile?.avatar || 'detective_1')}
              </div>
              <div className="profile-info">
                <h2>{user?.username}</h2>
                <p className="profile-name">{user?.first_name} {user?.last_name}</p>
                <p className="profile-email">{user?.email}</p>
                <div className="profile-level">
                  <span className="level-badge">Level {profile?.experience_level || 'Rookie'}</span>
                  <span className="score-badge">{profile?.total_score || 0} points</span>
                </div>
              </div>
              <div className="profile-actions">
                {!editing ? (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditing(false);
                      setErrors({});
                      setProfileForm({
                        avatar: profile?.avatar || 'detective_1',
                        preferred_category: profile?.preferred_category || 'mixed',
                        bio: profile?.bio || ''
                      });
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Profile Edit Form */}
            {editing && (
              <div className="profile-edit">
                <h3>Edit Profile</h3>
                <form onSubmit={handleSubmit} className="profile-form">
                  <div className="form-group">
                    <label className="form-label">Avatar</label>
                    <select
                      className="form-input"
                      value={profileForm.avatar}
                      onChange={(e) => handleInputChange('avatar', e.target.value)}
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
                    {renderError('avatar')}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Preferred Question Category</label>
                    <select
                      className="form-input"
                      value={profileForm.preferred_category}
                      onChange={(e) => handleInputChange('preferred_category', e.target.value)}
                    >
                      <option value="mixed">Mixed (All Categories)</option>
                      <option value="math">Mathematics</option>
                      <option value="science">Science</option>
                      <option value="history">History</option>
                      <option value="geography">Geography</option>
                      <option value="sports">Sports</option>
                      <option value="entertainment">Entertainment</option>
                    </select>
                    {renderError('preferred_category')}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bio</label>
                    <textarea
                      className={`form-input ${errors.bio ? 'error' : ''}`}
                      placeholder="Tell other players about yourself..."
                      rows="4"
                      maxLength="500"
                      value={profileForm.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                    />
                    {renderError('bio')}
                    <small className="form-help">
                      {profileForm.bio.length}/500 characters
                    </small>
                  </div>

                  {errors.general && (
                    <div className="error-message general-error">
                      {Array.isArray(errors.general) ? errors.general[0] : errors.general}
                    </div>
                  )}

                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Updating...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Bio Display */}
            {!editing && profile?.bio && (
              <div className="profile-bio">
                <h3>About</h3>
                <p>{profile.bio}</p>
              </div>
            )}
          </div>

          {/* Statistics Sidebar */}
          <div className="profile-sidebar">
            <div className="stats-section">
              <h3>Game Statistics</h3>
              
              {stats ? (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{stats.total_games || 0}</div>
                    <div className="stat-label">Games Played</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.total_wins || 0}</div>
                    <div className="stat-label">Games Won</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{Math.round(stats.win_rate || 0)}%</div>
                    <div className="stat-label">Win Rate</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.total_score || 0}</div>
                    <div className="stat-label">Total Score</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">#{stats.rank || 'N/A'}</div>
                    <div className="stat-label">Global Rank</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.consecutive_wins || 0}</div>
                    <div className="stat-label">Current Streak</div>
                  </div>
                </div>
              ) : (
                <p>No statistics available yet. Play some games to see your stats!</p>
              )}
            </div>

            {/* Role Performance */}
            {stats && (
              <div className="role-performance">
                <h3>Role Performance</h3>
                <div className="role-stats">
                  <div className="role-stat">
                    <h4>As Detective</h4>
                    <p>Wins: {stats.total_detective_wins || 0}</p>
                    <p>Win Rate: {Math.round(stats.detective_win_rate || 0)}%</p>
                  </div>
                  <div className="role-stat">
                    <h4>As Imposter</h4>
                    <p>Wins: {stats.total_imposter_wins || 0}</p>
                    <p>Win Rate: {Math.round(stats.imposter_win_rate || 0)}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Games */}
            {stats?.recent_games && stats.recent_games.length > 0 && (
              <div className="recent-games">
                <h3>Recent Games</h3>
                <div className="games-list">
                  {stats.recent_games.slice(0, 5).map((game, index) => (
                    <div key={index} className="game-item">
                      <div className="game-info">
                        <div className="game-title">Game #{game.id}</div>
                        <div className="game-details">
                          {game.players_count} players • {game.rounds_played} rounds
                        </div>
                      </div>
                      <div className="game-result">
                        <span className={`result-badge ${game.won ? 'won' : 'lost'}`}>
                          {game.won ? 'Won' : 'Lost'}
                        </span>
                        <div className="game-score">+{game.score_earned} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
