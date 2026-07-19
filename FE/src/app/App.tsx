import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Scanner from './components/Scanner';
import Results from './components/Results';
import History from './components/History';
import Admin from './components/Admin';
import { clearAuth, isLoggedIn, isAdminLoggedIn } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAuthenticated(isLoggedIn());
    setIsAdmin(isAdminLoggedIn());
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setIsAdmin(isAdminLoggedIn());
  };

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />}
        />
        <Route
          path="/"
          element={isAuthenticated ? <Scanner onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/results/:id"
          element={isAuthenticated ? <Results onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/history"
          element={isAuthenticated ? <History onLogout={handleLogout} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={isAuthenticated && isAdmin ? <Admin onLogout={handleLogout} /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
