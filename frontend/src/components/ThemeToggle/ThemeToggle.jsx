import React from 'react';
import { Button } from 'react-bootstrap';
import { Sun, Moon } from 'react-bootstrap-icons';
import { useTheme } from '../../context/ThemeContext';
import './ThemeToggle.scss';

const ThemeToggle = ({ className = "" }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline-secondary"
      size="sm"
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="icon-container">
        <Sun className={`sun-icon ${!isDarkMode ? 'active' : ''}`} size={18} />
        <Moon className={`moon-icon ${isDarkMode ? 'active' : ''}`} size={18} />
      </div>
    </Button>
  );
};

export default ThemeToggle;