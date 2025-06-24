import React, { useState } from 'react';
import { Card, Form, Button, ListGroup, Spinner, Alert } from 'react-bootstrap';
import { Search, X } from 'react-bootstrap-icons';
import { searchMessages } from '../../api';
import './SearchWidget.scss';

const SearchWidget = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const searchResults = await searchMessages(query);
      setResults(searchResults);
    } catch (error) {
      setError('Failed to search messages. Please try again.');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Card className="search-widget">
      <Card.Header className="search-widget-header">
        <div className="d-flex align-items-center">
          <Search size={20} className="me-2" />
          <span className="fw-semibold">Search Messages</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="close-btn">
          <X size={18} />
        </Button>
      </Card.Header>
      
      <Card.Body className="search-widget-body">
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            placeholder="Search your chat history..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="search-input"
          />
          <Button 
            variant="primary" 
            onClick={handleSearch} 
            disabled={!query.trim() || loading}
            className="search-btn mt-2"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Searching...
              </>
            ) : (
              <>
                <Search size={16} className="me-2" />
                Search
              </>
            )}
          </Button>
        </Form.Group>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {results.length > 0 && (
          <div className="search-results">
            <h6 className="mb-3">Search Results ({results.length})</h6>
            <ListGroup>
              {results.map((message, index) => (
                <ListGroup.Item key={index} className="search-result-item">
                  <div className="result-role">
                    <strong>{message.role === 'user' ? 'You' : 'AI Tutor'}:</strong>
                  </div>
                  <div className="result-content">
                    {message.content.substring(0, 200)}
                    {message.content.length > 200 && '...'}
                  </div>
                  <div className="result-timestamp">
                    {new Date(message.timestamp).toLocaleString()}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}

        {results.length === 0 && query && !loading && (
          <div className="no-results">
            <p className="text-muted">No messages found for "{query}"</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default SearchWidget;