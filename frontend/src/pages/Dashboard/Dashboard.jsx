import { useState, useEffect } from "react";
import { useLocation, Routes, Route } from "react-router-dom";
import Sidebar from './SideBar/Sidebar';
import DashboardHome from "./DashboardHome/DashboardHome";
import Learning from "./Learning/Learning";
import QuizSystem from "./QuizSystem/QuizSystem";
import AdminDashboard from "./AdminDashboard/AdminDashboard";
import UserLessons from "./UserLessons/UserLessons";
import LessonView from "./LessonView/LessonView";
import LessonEdit from "./LessonEdit/LessonEdit";
import AIChat from "../../components/AIChat/AIChat";
import UserProfile from "../../components/UserProfile/UserProfile";
import ErrorBoundary from "../../components/ErrorBoundary";
import FloatingActionButton from "../../components/FloatingActionButton/FloatingActionButton";
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
    } else if (path.includes('/lessons')) {
      setActiveScreen('user-lessons');
    } else if (path.includes('/admin') && isAdmin) {
      setActiveScreen('admin');
    } else {
      setActiveScreen('dashboard');
    }
  }, [location.pathname, isAdmin]);

  // Determine if we should show the floating action button
  const showFloatingButton = activeScreen !== 'chat';

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
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/chat" element={
            <ErrorBoundary>
              <AIChat />
            </ErrorBoundary>
          } />
          <Route path="/learning-paths" element={
            <ErrorBoundary>
              <Learning />
            </ErrorBoundary>
          } />
          <Route path="/quiz-system" element={
            <ErrorBoundary>
              <QuizSystem />
            </ErrorBoundary>
          } />
          <Route path="/profile" element={
            <ErrorBoundary>
              <UserProfile />
            </ErrorBoundary>
          } />
          {isAdmin && (
            <Route path="/lessons" element={
              <ErrorBoundary>
                <UserLessons />
              </ErrorBoundary>
            } />
          )}
          {isAdmin && (
            <Route path="/lessons/view/:lessonId" element={
              <ErrorBoundary>
                <LessonView />
              </ErrorBoundary>
            } />
          )}
          {isAdmin && (
            <Route path="/lessons/edit/:lessonId" element={
              <ErrorBoundary>
                <LessonEdit />
              </ErrorBoundary>
            } />
          )}
          {isAdmin && (
            <Route path="/admin" element={
              <ErrorBoundary>
                <AdminDashboard />
              </ErrorBoundary>
            } />
          )}
        </Routes>
        
        {/* Floating Action Button */}
        {showFloatingButton && <FloatingActionButton />}
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