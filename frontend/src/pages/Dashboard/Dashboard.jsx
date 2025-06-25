import { useState } from "react";
import Sidebar from './SideBar/Sidebar';
import DashboardHome from "./DashboardHome/DashboardHome";
import Learning from "./Learning/Learning";
import QuizSystem from "./QuizSystem/QuizSystem";
import AdminDashboard from "./AdminDashboard/AdminDashboard";
import AIChat from "../../components/AIChat/AIChat";
import ErrorBoundary from "../../components/ErrorBoundary";
import './Dashboard.scss';

const Dashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeScreen, setActiveScreen] = useState("dashboard");

  // Check if user is admin
  const isAdmin = localStorage.getItem("isAdmin") === "true";

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