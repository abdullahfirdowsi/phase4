import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Dashboard from "./pages/Dashboard/Dashboard";
import Welcome from "./pages/Welcome/Welcome";
import Header from "./components/Header/Header";
import { ThemeProvider } from "./context/ThemeContext";
import "./App.scss";

const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  return !!(token && username && token.trim() !== "" && username.trim() !== "");
};

const ProtectedRoute = ({ element }) => {
  return isAuthenticated() ? element : <Navigate to="/welcome" replace />;
};

const PublicRoute = ({ element }) => {
  return !isAuthenticated() ? element : <Navigate to="/welcome" replace />;
};

const AppContent = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Check if we're on dashboard pages
  const isDashboardPage = location.pathname.startsWith('/dashboard');
  
  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  
  return (
    <div className="app-container">
      <Header 
        onMobileMenuToggle={handleMobileMenuToggle}
        showMobileMenuToggle={isDashboardPage && isAuthenticated()}
      />
      <main className="main-content">
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated() ? 
                <Navigate to="/dashboard" replace /> : 
                <Navigate to="/welcome" replace />
            } 
          />
          
          <Route 
            path="/welcome" 
            element={<PublicRoute element={<Welcome />} />} 
          />
          
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute 
                element={
                  <Dashboard 
                    mobileMenuOpen={mobileMenuOpen}
                    onMobileMenuToggle={handleMobileMenuToggle}
                  />
                } 
              />
            }
          />
          
          <Route 
            path="*" 
            element={
              isAuthenticated() ? 
                <Navigate to="/dashboard" replace /> : 
                <Navigate to="/welcome" replace />
            } 
          />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
};

export default App;