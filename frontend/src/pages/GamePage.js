import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './GamePage.css';

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { currentRoom, currentRound, getCurrentRound, submitAnswer, startVoting, submitVote, continueToNextRound, leaveRoom } = useGame();
  const { user, getAvatarEmoji } = useAuth();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [answerInput, setAnswerInput] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);

  useEffect(() => {
    // Do not fetch immediately to avoid instant request on page load
    // Only validate room presence
    if (!currentRoom || String(currentRoom.id) !== String(roomId)) {
      navigate('/menu');
      return;
    }
    setLoading(false);
  }, [roomId, currentRoom, navigate]);

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    
    if (!answerInput.trim()) {
      showNotification('Please enter an answer', 'error');
      return;
    }

    setSubmittingAnswer(true);
    try {
      await submitAnswer(answerInput);
      setAnswerInput('');
      showNotification('Answer submitted successfully!', 'success');
    } catch (error) {
      console.error('Submit answer failed:', error);
      const errorMessage = error.response?.data?.error || 'Failed to submit answer';
      showNotification(errorMessage, 'error');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleStartVoting = async () => {
    try {
      await startVoting();
      showNotification('Voting phase started!', 'success');
    } catch (error) {
      console.error('Start voting failed:', error);
      const errorMessage = error.response?.data?.error || 'Failed to start voting';
      showNotification(errorMessage, 'error');
    }
  };

  const handleSubmitVote = async (playerId) => {
    setSubmittingVote(true);
    try {
      await submitVote(playerId);
      showNotification('Vote submitted successfully!', 'success');
    } catch (error) {
      console.error('Submit vote failed:', error);
      const errorMessage = error.response?.data?.error || 'Failed to submit vote';
      showNotification(errorMessage, 'error');
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleContinueToNextRound = async () => {
    try {
      const result = await continueToNextRound();
      
      if (result.gameEnded) {
        showNotification('Game has ended!', 'info');
        navigate('/menu');
      } else if (result.nextRound) {
        showNotification(`Round ${result.nextRound} started!`, 'success');
      }
    } catch (error) {
      console.error('Failed to continue to next round:', error);
      const errorMessage = error.response?.data?.error || 'Failed to advance to next round';
      showNotification(errorMessage, 'error');
    }
  };

  const handleLeaveGame = async () => {
    if (window.confirm('Are you sure you want to leave the game?')) {
      await leaveRoom();
      navigate('/menu');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentRoom) {
    return (
      <div className="game-page">
        <div className="container">
          <div className="error-state">
            <h2>Game Not Found</h2>
            <p>The game session could not be loaded.</p>
            <button className="btn btn-primary" onClick={() => navigate('/menu')}>
              Return to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="game-page">
        <div className="container">
          <div className="loading-phase" style={{padding: '2rem', textAlign: 'center'}}>
            <LoadingSpinner />
            <p>Waiting for next update...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderPhaseContent = () => {
    switch (currentRound.status) {
      case 'answering':
        return (
          <div className="phase-content">
            <div className="question-section">
              <h3>Question</h3>
              <div className="question-card">
                <p className="question-text">{currentRound.question?.text}</p>
                <p className="question-hint">
                  Category: {currentRound.question?.category} | 
                  Difficulty: {currentRound.question?.difficulty_level}
                </p>
              </div>
            </div>

            <div className="answer-section">
              <h3>Your Answer</h3>
              <form onSubmit={handleSubmitAnswer} className="answer-form">
                <div className="form-group">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Enter your numerical answer"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    disabled={submittingAnswer}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submittingAnswer}
                >
                  {submittingAnswer ? 'Submitting...' : 'Submit Answer'}
                </button>
              </form>
            </div>
          </div>
        );

      case 'discussion':
        return (
          <div className="phase-content">
            <div className="discussion-section">
              <h3>Discussion Phase</h3>
              <p>Review all submitted answers and discuss who might be the imposter.</p>
              
              <div className="answers-display">
                <h4>All Answers</h4>
                {currentRound.answers && currentRound.answers.length > 0 ? (
                  <div className="answers-list">
                    {currentRound.answers.map((answer, index) => (
                      <div key={index} className="answer-item">
                        <div className="player-info">
                          <span className="avatar">{getAvatarEmoji(answer.player.avatar)}</span>
                          <span className="nickname">{answer.player.nickname}</span>
                        </div>
                        <div className="answer-value">{answer.answer}</div>
                        {answer.is_imposter_answer && (
                          <span className="imposter-badge">Imposter Answer</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No answers submitted yet</p>
                )}
              </div>

              {/* Host can start voting */}
              {currentRoom.players?.find(p => p.user?.id === user?.id)?.is_host && (
                <button 
                  className="btn btn-warning"
                  onClick={handleStartVoting}
                >
                  Start Voting Phase
                </button>
              )}
            </div>
          </div>
        );

      case 'voting':
        return (
          <div className="phase-content">
            <div className="voting-section">
              <h3>Voting Phase</h3>
              <p>Vote for who you think is the imposter!</p>
              
              <div className="voting-options">
                {currentRound.players && currentRound.players.length > 0 ? (
                  <div className="players-grid">
                    {currentRound.players.map((player) => (
                      <div 
                        key={player.id} 
                        className="vote-option"
                        onClick={() => !submittingVote && handleSubmitVote(player.id)}
                      >
                        <div className="player-avatar">
                          {getAvatarEmoji(player.avatar)}
                        </div>
                        <div className="player-name">{player.nickname}</div>
                        {submittingVote && (
                          <div className="voting-spinner">Voting...</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No players available for voting</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'results':
        return (
          <div className="phase-content">
            <div className="results-section">
              <h3>Round Results</h3>
              
              <div className="results-display">
                <div className="result-item">
                  <strong>Imposter:</strong> {currentRound.imposter?.nickname || 'Unknown'}
                </div>
                <div className="result-item">
                  <strong>Correct Answer:</strong> {currentRound.question?.correct_answer || 'Unknown'}
                </div>
                <div className="result-item">
                  <strong>Imposter Answer:</strong> {currentRound.decoy_question?.correct_answer || 'Unknown'}
                </div>
              </div>

              {/* Host can continue to next round */}
              {currentRoom.players?.find(p => p.user?.id === user?.id)?.is_host && (
                <button 
                  className="btn btn-success"
                  onClick={handleContinueToNextRound}
                >
                  Continue to Next Round
                </button>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="phase-content">
            <div className="loading-phase">
              <LoadingSpinner />
              <p>Loading game phase...</p>
            </div>
          </div>
        );
    }
  };

  const getPhaseTitle = () => {
    switch (currentRound.status) {
      case 'answering': return 'Answer the Question';
      case 'discussion': return 'Discussion Time';
      case 'voting': return 'Vote for the Imposter';
      case 'results': return 'Round Results';
      default: return 'Loading...';
    }
  };

  const getPhaseDescription = () => {
    switch (currentRound.status) {
      case 'answering': return 'Submit your best guess for the numerical answer';
      case 'discussion': return 'Review answers and discuss who might be the imposter';
      case 'voting': return 'Vote for who you think gave the wrong answer on purpose';
      case 'results': return 'See who was the imposter and how everyone performed';
      default: return 'Please wait while the round loads';
    }
  };

  return (
    <div className="game-page">
      <div className="container">
        <div className="game-header">
          <div className="room-info">
            <h1>{currentRoom.name}</h1>
            <div className="game-stats">
              <span>Round {currentRound.round_number} of {currentRoom.total_rounds}</span>
              <span>•</span>
              <span>{currentRoom.players?.length || 0} Players</span>
            </div>
          </div>
          
          <button className="btn btn-secondary" onClick={handleLeaveGame}>
            Leave Game
          </button>
        </div>

        <div className="game-content">
          <div className="phase-header">
            <h2>{getPhaseTitle()}</h2>
            <p>{getPhaseDescription()}</p>
          </div>

          {renderPhaseContent()}
        </div>

        <div className="game-sidebar">
          <div className="players-list">
            <h3>Players</h3>
            {currentRoom.players?.map((player) => (
              <div key={player.id} className="player-item">
                <span className="avatar">{getAvatarEmoji(player.user?.profile?.avatar || player.avatar)}</span>
                <span className="nickname">
                  {player.nickname}
                  {player.user?.id === user?.id && ' (You)'}
                  {player.is_host && ' 👑'}
                </span>
                <span className={`status ${player.is_connected ? 'connected' : 'disconnected'}`}>
                  {player.is_connected ? '🟢' : '🔴'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
