import React, { useEffect } from 'react';
import { googleLogin } from '../../api';
import { useNavigate } from 'react-router-dom';

const GoogleOAuth = ({ onSuccess, onError }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Google OAuth
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || "your-google-client-id",
        callback: handleGoogleResponse,
      });
    }
  }, []);

  const handleGoogleResponse = async (response) => {
    try {
      const data = await googleLogin(response.credential);
      if (onSuccess) {
        onSuccess(data);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      if (onError) {
        onError(error.message);
      }
    }
  };

  const handleGoogleLogin = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      if (onError) {
        onError("Google OAuth not loaded. Please refresh and try again.");
      }
    }
  };

  return { handleGoogleLogin };
};

export default GoogleOAuth;