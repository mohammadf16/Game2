import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import NotificationContainer from './components/NotificationContainer';
import AuthPage from './pages/AuthPage';
import MainMenuPage from './pages/MainMenuPage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import './App.css';
import LoadingSpinner from './components/LoadingSpinner';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <Navbar />
      <NotificationContainer />
      
      <Routes>
        {/* Public routes */}
        <Route 
          path="/auth" 
          element={!user ? <AuthPage /> : <Navigate to="/menu" replace />} 
        />
        
        {/* Protected routes */}
        <Route 
          path="/menu" 
          element={user ? <MainMenuPage /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/create-room" 
          element={user ? <CreateRoomPage /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/join-room" 
          element={user ? <JoinRoomPage /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/lobby/:roomId" 
          element={user ? <LobbyPage /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/game/:roomId" 
          element={user ? <GamePage /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/profile" 
          element={user ? <ProfilePage /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/leaderboard" 
          element={user ? <LeaderboardPage /> : <Navigate to="/auth" replace />} 
        />
        
        {/* Default redirect */}
        <Route 
          path="/" 
          element={<Navigate to={user ? "/menu" : "/auth"} replace />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={user ? "/menu" : "/auth"} replace />} 
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <GameProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </GameProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
