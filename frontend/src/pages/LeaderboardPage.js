import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { user, getAvatarEmoji } = useAuth();
  const { apiCall } = useGame();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('score');
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    loadLeaderboard('score');
  }, []);

  const loadLeaderboard = async (type) => {
    setLoading(true);
    try {
      const response = await apiCall(`/leaderboard/?type=${type}`);
      setLeaderboard(response.leaderboard || []);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      showNotification('Failed to load leaderboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (type) => {
    setActiveTab(type);
    await loadLeaderboard(type);
  };

  const getStatValue = (profile, type) => {
    switch (type) {
      case 'score':
        return profile.total_score || 0;
      case 'wins':
        return profile.total_wins || 0;
      case 'games':
        return profile.total_games || 0;
      case 'win_rate':
        return `${Math.round(profile.win_rate || 0)}%`;
      default:
        return 0;
    }
  };

  const getStatLabel = (type) => {
    switch (type) {
      case 'score':
        return 'Total Score';
      case 'wins':
        return 'Total Wins';
      case 'games':
        return 'Games Played';
      case 'win_rate':
        return 'Win Rate';
      default:
        return 'Score';
    }
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `#${index + 1}`;
    }
  };

  return (
    <div className="leaderboard-page">
      <div className="container">
        <div className="page-header">
          <h1>Leaderboard</h1>
          <p>See how you stack up against other players</p>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/menu')}
          >
            ← Back to Menu
          </button>
        </div>

        <div className="leaderboard-tabs">
          <button 
            className={`tab-btn ${activeTab === 'score' ? 'active' : ''}`}
            onClick={() => handleTabChange('score')}
          >
            🏆 Top Score
          </button>
          <button 
            className={`tab-btn ${activeTab === 'wins' ? 'active' : ''}`}
            onClick={() => handleTabChange('wins')}
          >
            🎯 Most Wins
          </button>
          <button 
            className={`tab-btn ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => handleTabChange('games')}
          >
            🎮 Most Active
          </button>
          <button 
            className={`tab-btn ${activeTab === 'win_rate' ? 'active' : ''}`}
            onClick={() => handleTabChange('win_rate')}
          >
            📈 Best Win Rate
          </button>
        </div>

        <div className="leaderboard-content">
          {loading ? (
            <LoadingSpinner message="Loading leaderboard..." />
          ) : leaderboard.length === 0 ? (
            <div className="empty-state">
              <h3>No players found</h3>
              <p>Be the first to play and claim your spot on the leaderboard!</p>
            </div>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((profile, index) => (
                <div 
                  key={profile.user.id}
                  className={`leaderboard-item ${profile.user.id === user?.id ? 'current-user' : ''}`}
                >
                  <div className="rank">
                    {getRankIcon(index)}
                  </div>
                  
                  <div className="player-info">
                    <div className="player-avatar">
                      {getAvatarEmoji(profile.avatar)}
                    </div>
                    <div className="player-details">
                      <div className="player-name">{profile.user.username}</div>
                      <div className="player-level">Level {profile.experience_level}</div>
                    </div>
                  </div>
                  
                  <div className="player-stats">
                    <div className="primary-stat">
                      <div className="stat-value">{getStatValue(profile, activeTab)}</div>
                      <div className="stat-label">{getStatLabel(activeTab)}</div>
                    </div>
                    
                    <div className="secondary-stats">
                      <div className="secondary-stat">
                        <span className="stat-label">Games:</span>
                        <span className="stat-value">{profile.total_games || 0}</span>
                      </div>
                      <div className="secondary-stat">
                        <span className="stat-label">Win Rate:</span>
                        <span className="stat-value">{Math.round(profile.win_rate || 0)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {profile.user.id === user?.id && (
                    <div className="current-user-badge">
                      You
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player's Position */}
        {!loading && leaderboard.length > 0 && (
          <div className="player-position">
            <h3>Your Position</h3>
            {(() => {
              const userIndex = leaderboard.findIndex(p => p.user.id === user?.id);
              if (userIndex !== -1) {
                return (
                  <div className="position-info">
                    <p>
                      You are ranked <strong>#{userIndex + 1}</strong> out of {leaderboard.length} players
                      in the {getStatLabel(activeTab).toLowerCase()} category.
                    </p>
                  </div>
                );
              } else {
                return (
                  <div className="position-info">
                    <p>You haven't played enough games to appear on this leaderboard yet.</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => navigate('/menu')}
                    >
                      Start Playing
                    </button>
                  </div>
                );
              }
            })()}
          </div>
        )}

        {/* Leaderboard Info */}
        <div className="leaderboard-info">
          <h3>How Rankings Work</h3>
          <div className="info-grid">
            <div className="info-item">
              <h4>🏆 Total Score</h4>
              <p>Points earned from winning games and performing well as detective or imposter.</p>
            </div>
            <div className="info-item">
              <h4>🎯 Total Wins</h4>
              <p>Number of games won, regardless of role. Shows consistency and skill.</p>
            </div>
            <div className="info-item">
              <h4>🎮 Most Active</h4>
              <p>Players who have participated in the most games. Dedication matters!</p>
            </div>
            <div className="info-item">
              <h4>📈 Win Rate</h4>
              <p>Percentage of games won. Minimum 10 games required to appear on this board.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
