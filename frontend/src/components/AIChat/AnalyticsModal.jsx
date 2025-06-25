import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Spinner, Alert, Badge } from 'react-bootstrap';
import { BarChart, GraphUp, ChatSquare, Clock } from 'react-bootstrap-icons';
import { getChatAnalytics } from '../../api';
import { formatShortDate } from '../../utils/dateUtils';
import './AnalyticsModal.scss';

const AnalyticsModal = ({ show, onHide }) => {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30); // days

  useEffect(() => {
    if (show) {
      fetchAnalytics();
    }
  }, [show, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getChatAnalytics(timeRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Process analytics data
  const processData = () => {
    if (!analytics || analytics.length === 0) {
      return {
        messagesByDate: [],
        messagesByRole: { user: 0, assistant: 0 },
        averageLength: 0
      };
    }

    // Group by date and role
    const messagesByDate = {};
    const messagesByRole = { user: 0, assistant: 0 };
    let totalLength = 0;
    let totalMessages = 0;

    analytics.forEach(item => {
      const date = item._id.date;
      const role = item._id.role;
      
      // Add to date grouping
      if (!messagesByDate[date]) {
        messagesByDate[date] = { user: 0, assistant: 0 };
      }
      messagesByDate[date][role] = item.count;
      
      // Add to role totals
      messagesByRole[role] = (messagesByRole[role] || 0) + item.count;
      
      // Add to length calculation
      totalLength += item.avg_length * item.count;
      totalMessages += item.count;
    });

    // Convert to array for charting
    const dateLabels = Object.keys(messagesByDate).sort();
    const chartData = dateLabels.map(date => ({
      date,
      user: messagesByDate[date].user || 0,
      assistant: messagesByDate[date].assistant || 0,
      total: (messagesByDate[date].user || 0) + (messagesByDate[date].assistant || 0)
    }));

    return {
      messagesByDate: chartData,
      messagesByRole,
      averageLength: totalMessages > 0 ? Math.round(totalLength / totalMessages) : 0
    };
  };

  const { messagesByDate, messagesByRole, averageLength } = processData();
  const totalMessages = messagesByRole.user + messagesByRole.assistant;

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered
      className="analytics-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <BarChart size={20} className="me-2" />
          Chat Analytics
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <div className="time-selector mb-4">
          <button 
            className={`time-option ${timeRange === 7 ? 'active' : ''}`}
            onClick={() => setTimeRange(7)}
          >
            Last 7 Days
          </button>
          <button 
            className={`time-option ${timeRange === 30 ? 'active' : ''}`}
            onClick={() => setTimeRange(30)}
          >
            Last 30 Days
          </button>
          <button 
            className={`time-option ${timeRange === 90 ? 'active' : ''}`}
            onClick={() => setTimeRange(90)}
          >
            Last 90 Days
          </button>
        </div>
        
        {loading ? (
          <div className="loading-state">
            <Spinner animation="border" variant="primary" />
            <p>Loading analytics data...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : totalMessages === 0 ? (
          <div className="no-data">
            <ChatSquare size={48} className="mb-3" />
            <p>No chat data available for the selected period</p>
          </div>
        ) : (
          <>
            <Row className="stats-summary mb-4">
              <Col md={4}>
                <div className="stat-card">
                  <div className="stat-icon">
                    <ChatSquare size={20} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{totalMessages}</div>
                    <div className="stat-label">Total Messages</div>
                  </div>
                </div>
              </Col>
              <Col md={4}>
                <div className="stat-card">
                  <div className="stat-icon">
                    <GraphUp size={20} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{messagesByRole.user || 0}</div>
                    <div className="stat-label">Your Messages</div>
                  </div>
                </div>
              </Col>
              <Col md={4}>
                <div className="stat-card">
                  <div className="stat-icon">
                    <Clock size={20} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{averageLength}</div>
                    <div className="stat-label">Avg. Length</div>
                  </div>
                </div>
              </Col>
            </Row>
            
            <div className="chart-container">
              <h6 className="chart-title">Message Activity</h6>
              <div className="activity-chart">
                {messagesByDate.map((day, index) => (
                  <div key={index} className="day-column">
                    <div className="day-bars">
                      <div 
                        className="user-bar" 
                        style={{ height: `${Math.min(day.user * 5, 100)}px` }}
                        title={`Your messages: ${day.user}`}
                      />
                      <div 
                        className="ai-bar" 
                        style={{ height: `${Math.min(day.assistant * 5, 100)}px` }}
                        title={`AI responses: ${day.assistant}`}
                      />
                    </div>
                    <div className="day-label">{day.date.split('-')[2]}</div>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color user-color"></div>
                  <div className="legend-label">Your messages</div>
                </div>
                <div className="legend-item">
                  <div className="legend-color ai-color"></div>
                  <div className="legend-label">AI responses</div>
                </div>
              </div>
            </div>
            
            <div className="activity-summary mt-4">
              <h6 className="mb-3">Recent Activity</h6>
              <div className="activity-list">
                {messagesByDate.slice(-5).reverse().map((day, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-date">
                      <Badge bg="light" text="dark">
                        {day.date}
                      </Badge>
                    </div>
                    <div className="activity-details">
                      <div className="detail-item">
                        <span className="label">Your messages:</span>
                        <span className="value">{day.user}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">AI responses:</span>
                        <span className="value">{day.assistant}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Total:</span>
                        <span className="value">{day.total}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default AnalyticsModal;