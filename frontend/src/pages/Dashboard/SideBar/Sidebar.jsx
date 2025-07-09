import React from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.scss";
import { 
  House, 
  ChatDots, 
  Signpost, 
  ClipboardCheck, 
  Gear,
  ChevronLeft,
  ChevronRight,
  Book,
  Trophy,
  FileEarmarkText,
  PeopleFill
} from "react-bootstrap-icons";

const Sidebar = ({
  isCollapsed,
  toggleSidebar,
  setActiveScreen,
  activeScreen,
  isAdmin = false
}) => {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: "dashboard",
      text: "Home",
      icon: <House size={20} />,
      screen: "dashboard",
      path: "/dashboard"
    },
    {
      id: "chat",
      text: "AI Chat",
      icon: <ChatDots size={20} />,
      screen: "chat",
      path: "/dashboard/chat"
    },
    {
      id: "learning-paths",
      text: "Learning Paths",
      icon: <Signpost size={20} />,
      screen: "learning-paths",
      path: "/dashboard/learning-paths"
    },
    {
      id: "quiz-system",
      text: "Quiz",
      icon: <ClipboardCheck size={20} />,
      screen: "quiz-system",
      path: "/dashboard/quiz-system"
    },
  ];

  // Add admin-only menu items
  if (isAdmin) {
    menuItems.push({
      id: "user-lessons",
      text: "My Lessons",
      icon: <FileEarmarkText size={20} />,
      screen: "user-lessons",
      path: "/dashboard/lessons",
      isAdmin: true
    });
    
    menuItems.push({
      id: "admin",
      text: "Admin Panel",
      icon: <Gear size={20} />,
      screen: "admin",
      path: "/dashboard/admin",
      isAdmin: true
    });
  }

  const handleItemClick = (item) => {
    setActiveScreen(item.screen);
    navigate(item.path);
  };

  return (
    <div className={`modern-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* Sidebar Toggle */}
      <div className="sidebar-toggle-container">
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.id} className="nav-item-container">
              <button
                className={`nav-item ${activeScreen === item.screen ? 'active' : ''} ${item.isAdmin ? 'admin-item' : ''}`}
                onClick={() => handleItemClick(item)}
                title={isCollapsed ? item.text : undefined}
                aria-label={item.text}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-text">{item.text}</span>}
                {activeScreen === item.screen && <span className="active-indicator" />}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {/* Footer */}
      <div className="sidebar-footer">
        <span>AI Tutor - Copyright 2025</span>
      </div>
    </div>
  );
};

export default Sidebar;