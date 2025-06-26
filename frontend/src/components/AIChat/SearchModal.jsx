import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Button, ListGroup, Spinner, Alert } from 'react-bootstrap';
import { Search, X } from 'react-bootstrap-icons';
import { searchMessages } from '../../api';
import { formatLocalDateTime } from '../../utils/dateUtils';
import './SearchModal.scss';

const SearchModal = ({ show, onHide }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Debounced search function
  const debouncedSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchResults = await searchMessages(searchQuery);
      setResults(searchResults);
    } catch (error) {
      setError('Failed to search messages. Please try again.');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const newTimeout = setTimeout(() => {
      debouncedSearch(newQuery);
    }, 300); // 300ms delay

    setSearchTimeout(newTimeout);
  };

  // Manual search function (for button click)
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    // Clear any pending debounced search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
    
    await debouncedSearch(query);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!show) {
      setQuery('');
      setResults([]);
      setError(null);
      setLoading(false);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        setSearchTimeout(null);
      }
    }
  }, [show, searchTimeout]);

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered
      className="search-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          <Search size={20} className="me-2" />
          Search Chat History
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Control
            type="text"
            placeholder="Search your chat history... (results appear as you type)"
            value={query}
            onChange={handleInputChange}
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
                    {formatLocalDateTime(message.timestamp)}
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
      </Modal.Body>
    </Modal>
  );
};

export default SearchModal;