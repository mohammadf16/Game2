import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { useNotification } from '../contexts/NotificationContext';
import './MainMenuPage.css';

const MainMenuPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { apiCall } = useGame();
  const { showNotification } = useNotification();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserStats = async () => {
      try {
        const statsData = await apiCall('/profile/statistics/');
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserStats();
  }, [apiCall]);

  const menuItems = [
    {
      title: 'Create Room',
      description: 'Start a new game and invite friends',
      icon: '🎯',
      action: () => navigate('/create-room'),
      color: 'primary'
    },
    {
      title: 'Join Room',
      description: 'Join an existing public game',
      icon: '🚪',
      action: () => navigate('/join-room'),
      color: 'success'
    },
    {
      title: 'Profile',
      description: 'View and edit your profile',
      icon: '👤',
      action: () => navigate('/profile'),
      color: 'info'
    },
    {
      title: 'Leaderboard',
      description: 'See top players and rankings',
      icon: '🏆',
      action: () => navigate('/leaderboard'),
      color: 'warning'
    }
  ];

  const gameRules = [
    {
      title: 'The Setup',
      description: 'Players answer numerical questions. One player gets a different (decoy) question.'
    },
    {
      title: 'The Challenge',
      description: 'The imposter must blend in by guessing what the real answer might be.'
    },
    {
      title: 'The Hunt',
      description: 'After discussion, vote for who you think is the imposter.'
    },
    {
      title: 'The Victory',
      description: 'Detectives win by finding the imposter. Imposter wins by staying hidden.'
    }
  ];

  return (
    <div className="main-menu-page">
      <div className="container">
        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-content">
            <h1>Welcome back, {user?.first_name || user?.username}!</h1>
            <p>Ready for another round of deduction and strategy?</p>
          </div>
          
          {!loading && stats && (
            <div className="quick-stats">
              <div className="stat-item">
                <div className="stat-value">{stats.total_games || 0}</div>
                <div className="stat-label">Games Played</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.total_wins || 0}</div>
                <div className="stat-label">Games Won</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{Math.round(stats.win_rate || 0)}%</div>
                <div className="stat-label">Win Rate</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.total_score || 0}</div>
                <div className="stat-label">Total Score</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Menu Grid */}
        <div className="main-menu-grid">
          <div className="menu-section">
            <h2>Quick Actions</h2>
            <div className="menu-buttons">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className={`btn btn-large btn-${item.color}`}
                  onClick={item.action}
                >
                  <span className="btn-icon">{item.icon}</span>
                  <div className="btn-content">
                    <div className="btn-title">{item.title}</div>
                    <div className="btn-description">{item.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="menu-section">
            <h2>How to Play</h2>
            <div className="rules-grid">
              {gameRules.map((rule, index) => (
                <div key={index} className="rule-item">
                  <h4>{rule.title}</h4>
                  <p>{rule.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {!loading && stats?.recent_games && stats.recent_games.length > 0 && (
          <div className="recent-activity">
            <h2>Recent Games</h2>
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

        {/* Tips Section */}
        <div className="tips-section">
          <h2>💡 Pro Tips</h2>
          <div className="tips-grid">
            <div className="tip-item">
              <h4>As a Detective</h4>
              <p>Look for answers that seem too obvious or too far off. The imposter might be guessing!</p>
            </div>
            <div className="tip-item">
              <h4>As an Imposter</h4>
              <p>Try to guess what the real answer might be. Don't make it too obvious you don't know!</p>
            </div>
            <div className="tip-item">
              <h4>Discussion Phase</h4>
              <p>Ask questions and observe reactions. Sometimes the imposter gives themselves away!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainMenuPage;
