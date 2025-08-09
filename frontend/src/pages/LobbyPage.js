import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './LobbyPage.css';

const LobbyPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentRoom, toggleReady, startGame, leaveRoom, setGameState } = useGame();
  const { user, getAvatarEmoji } = useAuth();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have the room data
    if (!currentRoom || String(currentRoom.id) !== String(roomId)) {
      // Room not loaded, redirect to menu
      navigate('/menu');
      return;
    }

    // Check if game has started
    if (currentRoom.status === 'in_progress') {
      setGameState('playing');
      navigate(`/game/${roomId}`);
    }
  }, [currentRoom, roomId, navigate, setGameState]);

  const handleToggleReady = async () => {
    setLoading(true);
    try {
      const response = await toggleReady();
      showNotification(response.message, 'success');
    } catch (error) {
      console.error('Toggle ready failed:', error);
      showNotification('Failed to update ready status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    setLoading(true);
    try {
      await startGame();
      showNotification('Game started!', 'success');
      navigate(`/game/${roomId}`);
    } catch (error) {
      console.error('Start game failed:', error);
      showNotification('Failed to start game', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      await leaveRoom();
      navigate('/menu');
    }
  };

  if (!currentRoom) {
    return <LoadingSpinner />;
  }

  // Try to robustly identify the current player and host across varying backend shapes
  const toStr = (v) => (v === undefined || v === null ? '' : String(v));
  const currentPlayer = (currentRoom.players || []).find(p => {
    const uidMatch = toStr(p.user?.id) && toStr(user?.id) && toStr(p.user?.id) === toStr(user?.id);
    const unameMatch = p.user?.username && user?.username && p.user.username === user.username;
    const playerIdMatch = toStr(p.id) && toStr(currentRoom.host_player_id) && toStr(p.id) === toStr(currentRoom.host_player_id) && toStr(p.user?.id) === toStr(user?.id);
    return uidMatch || unameMatch || playerIdMatch;
  });

  const roomHostUserId = currentRoom.host_user_id || currentRoom.host_id || currentRoom.host?.id || currentRoom.host_user?.id;
  const isHost = Boolean(
    currentPlayer?.is_host || currentPlayer?.is_owner || currentPlayer?.role === 'host' ||
    (roomHostUserId && toStr(user?.id) && toStr(roomHostUserId) === toStr(user?.id)) ||
    (currentRoom.host_username && user?.username && currentRoom.host_username === user.username) ||
    (currentRoom.host_player_id && currentPlayer?.id && toStr(currentRoom.host_player_id) === toStr(currentPlayer.id))
  );
  const connectedPlayers = currentRoom.players?.filter(p => p.is_connected) || [];
  const readyPlayers = connectedPlayers.filter(p => p.is_ready);
  const minPlayers = currentRoom.min_players || 3; // Minimum players to start
  const canStart = isHost && connectedPlayers.length >= minPlayers && readyPlayers.length === connectedPlayers.length;
  
  // FORCE SHOW START BUTTON FOR DEBUGGING
  const forceShowStart = true;

  return (
    <div className="lobby-page">
      <div className="container">
        <div className="lobby-header">
          <div className="room-info">
            <h1>{currentRoom.name}</h1>
            <div className="room-details">
              <span className="room-code">Code: {currentRoom.room_code}</span>
              <span className="player-count">
                {currentRoom.player_count}/{currentRoom.max_players} Players
              </span>
            </div>
          </div>
          
          <button className="btn btn-secondary" onClick={handleLeaveRoom}>
            Leave Room
          </button>
        </div>

        <div className="lobby-content">
          <div className="players-section">
            <h2>Players</h2>
            <div className="players-grid">
              {currentRoom.players?.map((player) => (
                <div 
                  key={player.id} 
                  className={`player-card ${player.is_connected ? 'connected' : 'disconnected'}`}
                >
                  <div className="player-avatar">
                    {getAvatarEmoji(player.user?.profile?.avatar || player.avatar)}
                  </div>
                  <div className="player-info">
                    <div className="player-name">
                      {player.nickname}
                      {player.is_host && ' 👑'}
                      {player.user?.id === user?.id && ' (You)'}
                    </div>
                    <div className="player-status">
                      {player.is_ready ? '✅ Ready' : '⏳ Not Ready'}
                      {!player.is_connected && ' - Disconnected'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lobby-controls">
            <div className="ready-section">
              <div className="ready-controls">
                <button 
                  className={`btn btn-large ${currentPlayer?.is_ready ? 'btn-warning' : 'btn-success'}`}
                  onClick={handleToggleReady}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : (currentPlayer?.is_ready ? 'Not Ready' : (isHost ? 'Host Ready' : 'Ready Up'))}
                </button>
                {(isHost || forceShowStart) && (
                  <button 
                    className="btn btn-large btn-primary"
                    onClick={handleStartGame}
                    disabled={loading}
                    style={{ marginLeft: '12px' }}
                  >
                    {loading ? 'Starting...' : 'Start Game (FORCED ENABLED)'}
                  </button>
                )}
              </div>
            </div>

            <div className="lobby-status">
              {connectedPlayers.length < minPlayers ? (
                <div className="status-message warning">
                  <p>⏳ Waiting for more players...</p>
                  <p><small>Need at least {minPlayers} players (currently {connectedPlayers.length})</small></p>
                </div>
              ) : readyPlayers.length < connectedPlayers.length ? (
                <div className="status-message info">
                  <p>⏳ Waiting for players to be ready...</p>
                  <p><small>{readyPlayers.length}/{connectedPlayers.length} players ready</small></p>
                </div>
              ) : isHost ? (
                <div className="status-message success">
                  <p>✅ All players ready! You can start the game.</p>
                </div>
              ) : (
                <div className="status-message success">
                  <p>✅ All players ready! Waiting for host to start...</p>
                </div>
              )}
            </div>
          </div>

          <div className="room-settings">
            <h3>Game Settings</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <strong>Max Players:</strong> {currentRoom.max_players}
              </div>
              <div className="setting-item">
                <strong>Total Rounds:</strong> {currentRoom.total_rounds}
              </div>
              <div className="setting-item">
                <strong>Difficulty:</strong> {currentRoom.difficulty_level}
              </div>
              <div className="setting-item">
                <strong>Discussion Time:</strong> {currentRoom.discussion_time}s
              </div>
              <div className="setting-item">
                <strong>Voting Time:</strong> {currentRoom.voting_time}s
              </div>
              <div className="setting-item">
                <strong>Room Type:</strong> {currentRoom.is_private ? 'Private' : 'Public'}
              </div>
            </div>
          </div>
        </div>

        <div className="lobby-tips">
          <h3>💡 Getting Started</h3>
          <div className="tips-list">
            <div className="tip-item">
              <strong>For New Players:</strong> Don't worry if you're new! The game is easy to learn and fun to master.
            </div>
            <div className="tip-item">
              <strong>Strategy Tip:</strong> Pay attention during the discussion phase - that's where you'll find clues!
            </div>
            <div className="tip-item">
              <strong>Have Fun:</strong> Remember, it's all about deduction, bluffing, and having a great time with friends!
            </div>
          </div>
          <div style={{ marginTop: '16px', padding: '10px', border: '1px solid #f00', borderRadius: 6, backgroundColor: '#ffe6e6' }}>
            <strong>🔥 DEBUG - WHY NO START BUTTON:</strong>
            <div><strong>User ID:</strong> {String(user?.id || 'MISSING')}</div>
            <div><strong>Username:</strong> {String(user?.username || 'MISSING')}</div>
            <div><strong>Room host_user_id:</strong> {String(roomHostUserId || 'MISSING')}</div>
            <div><strong>Room host_player_id:</strong> {String(currentRoom.host_player_id || 'MISSING')}</div>
            <div><strong>Current player found:</strong> {currentPlayer ? 'YES' : 'NO'}</div>
            <div><strong>Current player id:</strong> {String(currentPlayer?.id || 'MISSING')}</div>
            <div><strong>currentPlayer.is_host:</strong> {String(currentPlayer?.is_host || 'MISSING')}</div>
            <div><strong>currentPlayer.is_owner:</strong> {String(currentPlayer?.is_owner || 'MISSING')}</div>
            <div><strong>currentPlayer.role:</strong> {String(currentPlayer?.role || 'MISSING')}</div>
            <div><strong>isHost computed:</strong> {String(isHost)}</div>
            <div><strong>Connected players:</strong> {String(connectedPlayers.length)}</div>
            <div><strong>Ready players:</strong> {String(readyPlayers.length)}</div>
            <div><strong>Min players needed:</strong> {String(minPlayers)}</div>
            <div><strong>canStart:</strong> {String(canStart)}</div>
            <div><strong>All players:</strong> {JSON.stringify(currentRoom.players?.map(p => ({id: p.id, user_id: p.user?.id, username: p.user?.username, is_host: p.is_host, is_ready: p.is_ready, is_connected: p.is_connected})) || [])}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
