import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

const App = () => {
  return (
    <ThemeProvider>
      <div className="app-container">
        <Router>
          <Header />
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
                element={<ProtectedRoute element={<Dashboard />} />}
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
        </Router>
      </div>
    </ThemeProvider>
  );
};

export default App;