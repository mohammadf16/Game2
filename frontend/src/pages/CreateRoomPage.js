import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { useNotification } from '../contexts/NotificationContext';
import './CreateRoomPage.css';

const CreateRoomPage = () => {
  const navigate = useNavigate();
  const { createRoom } = useGame();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_private: false,
    password: '',
    max_players: 6,
    total_rounds: 5,
    difficulty_level: 'medium',
    discussion_time: 60,
    voting_time: 30
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
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
      const room = await createRoom(formData);
      showNotification('Room created successfully!', 'success');
      navigate(`/lobby/${room.id}`);
    } catch (error) {
      console.error('Room creation failed:', error);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
      
      const errorMessage = error.response?.data?.error || 'Failed to create room';
      showNotification(errorMessage, 'error');
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

  return (
    <div className="create-room-page">
      <div className="container">
        <div className="page-header">
          <h1>Create New Room</h1>
          <p>Set up your game room and invite friends to join</p>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/menu')}
          >
            ← Back to Menu
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-room-form">
          <div className="form-sections">
            {/* Basic Information */}
            <div className="form-section">
              <h3>Basic Information</h3>
              
              <div className="form-group">
                <label className="form-label">Room Name *</label>
                <input
                  type="text"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="Enter a catchy room name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
                {renderError('name')}
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className={`form-input ${errors.description ? 'error' : ''}`}
                  placeholder="Describe your room or add special rules"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
                {renderError('description')}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="form-section">
              <h3>Privacy Settings</h3>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_private}
                    onChange={(e) => handleInputChange('is_private', e.target.checked)}
                  />
                  Make this room private
                  <span className="checkmark">🔒</span>
                </label>
                <small className="form-help">
                  Private rooms won't appear in the public room list
                </small>
              </div>

              {formData.is_private && (
                <div className="form-group">
                  <label className="form-label">Password (Optional)</label>
                  <input
                    type="password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="Set a password for extra security"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                  {renderError('password')}
                  <small className="form-help">
                    Leave empty if you don't want password protection
                  </small>
                </div>
              )}
            </div>

            {/* Game Settings */}
            <div className="form-section">
              <h3>Game Settings</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Max Players</label>
                  <select
                    className="form-input"
                    value={formData.max_players}
                    onChange={(e) => handleInputChange('max_players', parseInt(e.target.value))}
                  >
                    <option value={4}>4 Players</option>
                    <option value={5}>5 Players</option>
                    <option value={6}>6 Players</option>
                    <option value={7}>7 Players</option>
                    <option value={8}>8 Players</option>
                    <option value={10}>10 Players</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Total Rounds</label>
                  <select
                    className="form-input"
                    value={formData.total_rounds}
                    onChange={(e) => handleInputChange('total_rounds', parseInt(e.target.value))}
                  >
                    <option value={3}>3 Rounds (Quick)</option>
                    <option value={5}>5 Rounds (Standard)</option>
                    <option value={7}>7 Rounds (Extended)</option>
                    <option value={10}>10 Rounds (Marathon)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Difficulty Level</label>
                <select
                  className="form-input"
                  value={formData.difficulty_level}
                  onChange={(e) => handleInputChange('difficulty_level', e.target.value)}
                >
                  <option value="easy">Easy - Simple questions</option>
                  <option value="medium">Medium - Moderate challenge</option>
                  <option value="hard">Hard - Expert level</option>
                  <option value="mixed">Mixed - Variety of difficulties</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Discussion Time</label>
                  <select
                    className="form-input"
                    value={formData.discussion_time}
                    onChange={(e) => handleInputChange('discussion_time', parseInt(e.target.value))}
                  >
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={90}>1.5 minutes</option>
                    <option value={120}>2 minutes</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Voting Time</label>
                  <select
                    className="form-input"
                    value={formData.voting_time}
                    onChange={(e) => handleInputChange('voting_time', parseInt(e.target.value))}
                  >
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>1 minute</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {errors.general && (
            <div className="error-message general-error">
              {Array.isArray(errors.general) ? errors.general[0] : errors.general}
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => navigate('/menu')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating Room...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomPage;
