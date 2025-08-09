import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './JoinRoomPage.css';

const JoinRoomPage = () => {
  const navigate = useNavigate();
  const { joinRoom, joinRoomByCode, apiCall } = useGame();
  const { showNotification } = useNotification();
  
  const [activeTab, setActiveTab] = useState('browse');
  const [loading, setLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [joinForm, setJoinForm] = useState({
    nickname: '',
    password: ''
  });

  const [codeForm, setCodeForm] = useState({
    room_code: '',
    nickname: '',
    password: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadAvailableRooms();
  }, []);

  const loadAvailableRooms = async () => {
    try {
      const rooms = await apiCall('/rooms/');
      setAvailableRooms(rooms);
    } catch (error) {
      console.error('Failed to load rooms:', error);
      showNotification('Failed to load available rooms', 'error');
    } finally {
      setRoomsLoading(false);
    }
  };

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setJoinForm(prev => ({ ...prev, password: '' }));
    setErrors({});
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!selectedRoom) {
      showNotification('Please select a room first', 'error');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const room = await joinRoom(selectedRoom.id, joinForm);
      showNotification('Joined room successfully!', 'success');
      navigate(`/lobby/${room.id}`);
    } catch (error) {
      console.error('Join room failed:', error);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
      
      const errorMessage = error.response?.data?.error || 'Failed to join room. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const room = await joinRoomByCode(codeForm);
      showNotification('Joined room successfully!', 'success');
      navigate(`/lobby/${room.id}`);
    } catch (error) {
      console.error('Join by code failed:', error);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
      
      const errorMessage = error.response?.data?.error || 'Failed to join room. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (form, field, value) => {
    if (form === 'join') {
      setJoinForm(prev => ({ ...prev, [field]: value }));
    } else {
      setCodeForm(prev => ({ 
        ...prev, 
        [field]: field === 'room_code' ? value.toUpperCase() : value 
      }));
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

  const getRoomStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'success';
      case 'in_progress': return 'warning';
      case 'finished': return 'error';
      default: return 'secondary';
    }
  };

  const isRoomJoinable = (room) => {
    return room.status === 'waiting' && room.player_count < room.max_players;
  };

  return (
    <div className="join-room-page">
      <div className="container">
        <div className="page-header">
          <h1>Join a Room</h1>
          <p>Find an existing game or join with a room code</p>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/menu')}
          >
            ← Back to Menu
          </button>
        </div>

        <div className="join-tabs">
          <button 
            className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            Browse Rooms
          </button>
          <button 
            className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            Join by Code
          </button>
        </div>

        {/* Browse Rooms Tab */}
        {activeTab === 'browse' && (
          <div className="tab-content">
            <div className="browse-section">
              <div className="section-header">
                <h3>Available Public Rooms</h3>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={loadAvailableRooms}
                  disabled={roomsLoading}
                >
                  {roomsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {roomsLoading ? (
                <LoadingSpinner />
              ) : availableRooms.length === 0 ? (
                <div className="empty-state">
                  <p>No public rooms available at the moment.</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/create-room')}
                  >
                    Create a Room
                  </button>
                </div>
              ) : (
                <div className="rooms-grid">
                  {availableRooms.map((room) => (
                    <div 
                      key={room.id}
                      className={`room-card ${selectedRoom?.id === room.id ? 'selected' : ''} ${!isRoomJoinable(room) ? 'disabled' : ''}`}
                      onClick={() => isRoomJoinable(room) && handleRoomSelect(room)}
                    >
                      <div className="room-header">
                        <h4>
                          {room.name} 
                          {room.is_private && ' 🔒'}
                        </h4>
                        <span className={`room-status ${getRoomStatusColor(room.status)}`}>
                          {room.status}
                        </span>
                      </div>
                      <div className="room-info">
                        <p>Players: {room.player_count}/{room.max_players}</p>
                        <p>Rounds: {room.total_rounds}</p>
                        <p>Host: {room.host.username}</p>
                        {room.description && <p className="room-description">{room.description}</p>}
                        {room.is_private && <p className="text-warning">🔒 Private Room</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedRoom && (
                <form onSubmit={handleJoinRoom} className="join-form">
                  <h3>Join "{selectedRoom.name}"</h3>
                  
                  <div className="form-group">
                    <label className="form-label">Your Nickname *</label>
                    <input
                      type="text"
                      className={`form-input ${errors.nickname ? 'error' : ''}`}
                      placeholder="Enter your display name for this game"
                      value={joinForm.nickname}
                      onChange={(e) => handleInputChange('join', 'nickname', e.target.value)}
                      required
                    />
                    {renderError('nickname')}
                  </div>

                  {selectedRoom.has_password && (
                    <div className="form-group">
                      <label className="form-label">Room Password *</label>
                      <input
                        type="password"
                        className={`form-input ${errors.password ? 'error' : ''}`}
                        placeholder="Enter the room password"
                        value={joinForm.password}
                        onChange={(e) => handleInputChange('join', 'password', e.target.value)}
                        required
                      />
                      {renderError('password')}
                    </div>
                  )}

                  {errors.general && (
                    <div className="error-message general-error">
                      {Array.isArray(errors.general) ? errors.general[0] : errors.general}
                    </div>
                  )}

                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setSelectedRoom(null)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Joining...' : 'Join Room'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Join by Code Tab */}
        {activeTab === 'code' && (
          <div className="tab-content">
            <div className="code-section">
              <h3>Join with Room Code</h3>
              <p>Enter the 6-character room code shared by the host</p>

              <form onSubmit={handleJoinByCode} className="join-form">
                <div className="form-group">
                  <label className="form-label">Room Code *</label>
                  <input
                    type="text"
                    className={`form-input room-code-input ${errors.room_code ? 'error' : ''}`}
                    placeholder="ABC123"
                    maxLength={6}
                    value={codeForm.room_code}
                    onChange={(e) => handleInputChange('code', 'room_code', e.target.value)}
                    required
                  />
                  {renderError('room_code')}
                  <small className="form-help">
                    Room codes are 6 characters long (letters and numbers)
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Your Nickname *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.nickname ? 'error' : ''}`}
                    placeholder="Enter your display name for this game"
                    value={codeForm.nickname}
                    onChange={(e) => handleInputChange('code', 'nickname', e.target.value)}
                    required
                  />
                  {renderError('nickname')}
                </div>

                <div className="form-group">
                  <label className="form-label">Password (if required)</label>
                  <input
                    type="password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="Enter password if the room is protected"
                    value={codeForm.password}
                    onChange={(e) => handleInputChange('code', 'password', e.target.value)}
                  />
                  {renderError('password')}
                  <small className="form-help">
                    Leave empty if the room doesn't have a password
                  </small>
                </div>

                {errors.general && (
                  <div className="error-message general-error">
                    {Array.isArray(errors.general) ? errors.general[0] : errors.general}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary btn-large"
                  disabled={loading}
                >
                  {loading ? 'Joining Room...' : 'Join Room'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinRoomPage;
