import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [gameState, setGameState] = useState('menu'); // menu, lobby, playing
  const [pollInterval, setPollInterval] = useState(null);
  const [pollTimeout, setPollTimeout] = useState(null);
  const [roundFetchInFlight, setRoundFetchInFlight] = useState(false);
  const lastRoundFetchAt = useRef(0);

  // Global request rate limiter (single concurrency + min gap)
  const MIN_REQUEST_GAP_MS = 2000; // 2 seconds gap between ANY requests
  const requestQueue = useRef([]);
  const processing = useRef(false);
  const lastRequestAt = useRef(0);

  const scheduleRequest = (executor) => {
    return new Promise((resolve, reject) => {
      requestQueue.current.push({ executor, resolve, reject });
      processQueue();
    });
  };

  const processQueue = async () => {
    if (processing.current) return;
    processing.current = true;

    while (requestQueue.current.length > 0) {
      const now = Date.now();
      const elapsed = now - lastRequestAt.current;
      if (elapsed < MIN_REQUEST_GAP_MS) {
        const waitMs = MIN_REQUEST_GAP_MS - elapsed;
        await new Promise(r => setTimeout(r, waitMs));
      }

      const { executor, resolve, reject } = requestQueue.current.shift();
      try {
        const result = await executor();
        lastRequestAt.current = Date.now();
        resolve(result);
      } catch (err) {
        lastRequestAt.current = Date.now();
        reject(err);
      }
    }
    processing.current = false;
  };

  // API call helper
  const apiCall = async (endpoint, method = 'GET', data = null) => {
    return scheduleRequest(async () => {
      try {
        const config = {
          method,
          url: endpoint,
          ...(data && { data })
        };
        const response = await axios(config);
        return response.data;
      } catch (error) {
        console.error(`API call failed: ${method} ${endpoint}`, error);
        throw error;
      }
    });
  };

  // Room management
  const createRoom = async (roomData) => {
    try {
      const response = await apiCall('/rooms/create/', 'POST', roomData);
      setCurrentRoom(response);
      setGameState('lobby');
      return response;
    } catch (error) {
      throw error;
    }
  };

  const joinRoom = async (roomId, joinData) => {
    try {
      await apiCall(`/rooms/${roomId}/join/`, 'POST', joinData);
      const room = await apiCall(`/rooms/${roomId}/`);
      setCurrentRoom(room);
      setGameState('lobby');
      return room;
    } catch (error) {
      throw error;
    }
  };

  const joinRoomByCode = async (joinData) => {
    try {
      const response = await apiCall('/rooms/join-by-code/', 'POST', joinData);
      const room = await apiCall(`/rooms/${response.room.id}/`);
      setCurrentRoom(room);
      setGameState('lobby');
      return room;
    } catch (error) {
      throw error;
    }
  };

  const leaveRoom = async () => {
    if (!currentRoom) return;
    
    try {
      await apiCall(`/rooms/${currentRoom.id}/leave/`, 'POST');
    } catch (error) {
      console.error('Leave room error:', error);
    } finally {
      setCurrentRoom(null);
      setCurrentRound(null);
      setGameState('menu');
      stopPolling();
    }
  };

  const toggleReady = async () => {
    if (!currentRoom) return;
    
    try {
      const response = await apiCall(`/rooms/${currentRoom.id}/toggle-ready/`, 'POST');
      const updatedRoom = await apiCall(`/rooms/${currentRoom.id}/`);
      setCurrentRoom(updatedRoom);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const startGame = async () => {
    if (!currentRoom) return;
    
    try {
      await apiCall(`/rooms/${currentRoom.id}/start/`, 'POST');
      setGameState('playing');
      // Fetch round immediately after starting
      await getCurrentRound();
      return true;
    } catch (error) {
      throw error;
    }
  };

  // Game actions
  const getCurrentRound = async () => {
    if (!currentRoom) return null;
    
    try {
      if (roundFetchInFlight) return currentRound; // throttle overlapping calls
      // Time-based throttle to further reduce frequency
      const now = Date.now();
      if (now - lastRoundFetchAt.current < 5000) { // 5s min gap for round fetches
        return currentRound;
      }
      setRoundFetchInFlight(true);
      const roundData = await apiCall(`/rooms/${currentRoom.id}/round/`);
      setCurrentRound(roundData);
      lastRoundFetchAt.current = Date.now();
      return roundData;
    } catch (error) {
      throw error;
    }
    finally {
      setRoundFetchInFlight(false);
    }
  };

  const submitAnswer = async (answer) => {
    if (!currentRoom || !currentRound) return;
    
    try {
      const response = await apiCall(
        `/rooms/${currentRoom.id}/round/${currentRound.round_number}/submit-answer/`,
        'POST',
        { answer: parseInt(answer) }
      );
      
      // Refresh round data
      await getCurrentRound();
      return response;
    } catch (error) {
      throw error;
    }
  };

  const startVoting = async () => {
    if (!currentRoom || !currentRound) return;
    
    try {
      const response = await apiCall(
        `/rooms/${currentRoom.id}/round/${currentRound.round_number}/start-voting/`,
        'POST'
      );
      
      // Refresh round data
      await getCurrentRound();
      return response;
    } catch (error) {
      throw error;
    }
  };

  const submitVote = async (accusedPlayerId) => {
    if (!currentRoom || !currentRound) return;
    
    try {
      const response = await apiCall(
        `/rooms/${currentRoom.id}/round/${currentRound.round_number}/vote/`,
        'POST',
        { accused_player_id: parseInt(accusedPlayerId) }
      );
      
      // Refresh round data
      await getCurrentRound();
      return response;
    } catch (error) {
      throw error;
    }
  };

  const continueToNextRound = async () => {
    if (!currentRoom) return;
    
    try {
      const response = await apiCall(`/rooms/${currentRoom.id}/next-round/`, 'POST');
      
      if (response.next_round) {
        // Continue to next round
        await getCurrentRound();
        return { nextRound: response.next_round };
      } else {
        // Game ended
        setGameState('menu');
        setCurrentRoom(null);
        setCurrentRound(null);
        return { gameEnded: true };
      }
    } catch (error) {
      throw error;
    }
  };

  // Polling for real-time updates
  const startPolling = () => {
    // Clear any existing interval to avoid duplicates
    if (pollInterval) clearInterval(pollInterval);
    if (pollTimeout) clearTimeout(pollTimeout);

    // Define a single poll tick function
    const tick = async () => {
      try {
        // Update room data
        const updatedRoom = await apiCall(`/rooms/${currentRoom.id}/`);
        
        // Check for status changes
        if (updatedRoom.status !== currentRoom.status) {
          if (updatedRoom.status === 'in_progress' && gameState === 'lobby') {
            setGameState('playing');
          } else if (updatedRoom.status === 'finished') {
            setGameState('menu');
            setCurrentRoom(null);
            setCurrentRound(null);
            stopPolling();
            return;
          }
        }
        
        setCurrentRoom(updatedRoom);
        
        // Only update round while playing; guard with throttle inside getCurrentRound
        if (gameState === 'playing') await getCurrentRound();
      } catch (error) {
        console.error('Polling error:', error);
        if (error.response?.status === 404) {
          // Room no longer exists
          setCurrentRoom(null);
          setCurrentRound(null);
          setGameState('menu');
          stopPolling();
        }
      }
    };

    // Delay first tick by 60s to avoid immediate request
    const starter = setTimeout(() => {
      // First tick after initial delay
      tick();
      // Continue ticking every 60s thereafter
      const interval = setInterval(tick, 60000);
      setPollInterval(interval);
      setPollTimeout(null);
    }, 60000);
    // Track the timeout for proper cleanup
    setPollTimeout(starter);
  };

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    if (pollTimeout) {
      clearTimeout(pollTimeout);
      setPollTimeout(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Auto-start polling only in lobby (not during game to reduce backend load)
  useEffect(() => {
    if (currentRoom && gameState === 'lobby') {
      startPolling();
    } else {
      stopPolling();
    }
  }, [currentRoom, gameState]);

  const value = {
    currentRoom,
    currentRound,
    gameState,
    setGameState,
    
    // Room management
    createRoom,
    joinRoom,
    joinRoomByCode,
    leaveRoom,
    toggleReady,
    startGame,
    
    // Game actions
    getCurrentRound,
    submitAnswer,
    startVoting,
    submitVote,
    continueToNextRound,
    
    // Polling
    startPolling,
    stopPolling,
    
    // Utility
    apiCall
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
