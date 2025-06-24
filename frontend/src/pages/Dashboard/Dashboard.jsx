import { useState } from "react";
import ChatScreen from './ChatScreen/ChatScreen';
import Sidebar from './SideBar/Sidebar';
import DashboardHome from "./DashboardHome/DashboardHome";
import Learning from "./Learning/Learning";
import QuizSystem from "./QuizSystem/QuizSystem";
import AdminDashboard from "./AdminDashboard/AdminDashboard";
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
        return <ChatScreen />;
      case "learning-paths":
        return <Learning />;
      case "quiz-system":
        return <QuizSystem />;
      case "admin":
        return isAdmin ? <AdminDashboard /> : <DashboardHome />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="simple-dashboard">
      {/* Enhanced Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        setActiveScreen={setActiveScreen}
        activeScreen={activeScreen}
        isAdmin={isAdmin}
      />

      {/* Main Content Area */}
      <div className="dashboard-main">
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