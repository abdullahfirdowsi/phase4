import React, { useState, useEffect } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonDetail, updateLesson } from '../../../api';
import LessonBuilder from '../../../components/LessonBuilder/LessonBuilder';
import './LessonEdit.scss';

const LessonEdit = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchLessonDetail();
  }, [lessonId]);

  const fetchLessonDetail = async () => {
    try {
      setLoading(true);
      const data = await getLessonDetail(lessonId);
      
      // Verify user is the creator of this lesson
      const username = localStorage.getItem('username');
      if (data.lesson.createdBy !== username) {
        setError('You do not have permission to edit this lesson');
        setLoading(false);
        return;
      }
      
      setLesson(data.lesson);
    } catch (error) {
      console.error('Error fetching lesson:', error);
      setError('Failed to load lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLesson = async (lessonData) => {
    try {
      await updateLesson(lessonId, lessonData);
      setSuccess('Lesson updated successfully!');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate(`/dashboard/lessons/view/${lessonId}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating lesson:', error);
      setError('Failed to update lesson. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="lesson-edit-page">
        <Container fluid>
          <div className="loading-state">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading lesson...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lesson-edit-page">
        <Container fluid>
          <Alert variant="danger">
            {error}
          </Alert>
        </Container>
      </div>
    );
  }

  return (
    <div className="lesson-edit-page">
      <Container fluid>
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        
        <LessonBuilder 
          initialData={lesson} 
          onSave={handleUpdateLesson} 
        />
      </Container>
    </div>
  );
};

export default LessonEdit;