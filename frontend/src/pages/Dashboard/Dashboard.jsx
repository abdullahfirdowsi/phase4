import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from './SideBar/Sidebar';
import DashboardHome from "./DashboardHome/DashboardHome";
import Learning from "./Learning/Learning";
import QuizSystem from "./QuizSystem/QuizSystem";
import AdminDashboard from "./AdminDashboard/AdminDashboard";
import AIChat from "../../components/AIChat/AIChat";
import UserProfile from "../../components/UserProfile/UserProfile";
import ErrorBoundary from "../../components/ErrorBoundary";
import './Dashboard.scss';

const Dashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeScreen, setActiveScreen] = useState("dashboard");
  const location = useLocation();

  // Check if user is admin
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  
  // Handle URL-based routing
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/chat')) {
      setActiveScreen('chat');
    } else if (path.includes('/learning-paths')) {
      setActiveScreen('learning-paths');
    } else if (path.includes('/quiz-system')) {
      setActiveScreen('quiz-system');
    } else if (path.includes('/profile')) {
      setActiveScreen('profile');
    } else if (path.includes('/admin') && isAdmin) {
      setActiveScreen('admin');
    } else {
      setActiveScreen('dashboard');
    }
  }, [location.pathname, isAdmin]);

  const renderMainContent = () => {
    switch (activeScreen) {
      case "dashboard":
        return <DashboardHome />;
      case "chat":
        return (
          <ErrorBoundary>
            <AIChat />
          </ErrorBoundary>
        );
      case "learning-paths":
        return (
          <ErrorBoundary>
            <Learning />
          </ErrorBoundary>
        );
      case "quiz-system":
        return (
          <ErrorBoundary>
            <QuizSystem />
          </ErrorBoundary>
        );
      case "profile":
        return (
          <ErrorBoundary>
            <UserProfile />
          </ErrorBoundary>
        );
      case "admin":
        return isAdmin ? (
          <ErrorBoundary>
            <AdminDashboard />
          </ErrorBoundary>
        ) : (
          <DashboardHome />
        );
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Modern Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        setActiveScreen={setActiveScreen}
        activeScreen={activeScreen}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <div className={`dashboard-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderMainContent()}
      </div>

      {/* Mobile Overlay */}
      {!sidebarCollapsed && (
        <div 
          className="mobile-overlay d-lg-none"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
};

export default Dashboard;