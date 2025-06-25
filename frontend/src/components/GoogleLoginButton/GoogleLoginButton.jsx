import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button } from 'react-bootstrap';
import { FcGoogle } from 'react-icons/fc';
import { googleLogin } from '../../api';
import { useNavigate } from 'react-router-dom';
import './GoogleLoginButton.scss';

const GoogleLoginButton = ({ onSuccess, onError, buttonText = "Sign in with Google" }) => {
  const navigate = useNavigate();

  const handleGoogleLoginSuccess = async (tokenResponse) => {
    try {
      console.log('Google tokenResponse:', tokenResponse);
      
      // Check if we have access_token or credential (id_token)
      const credential = tokenResponse.access_token || tokenResponse.credential;
      
      if (!credential) {
        throw new Error('No valid credential received from Google');
      }
      
      // Call our backend API with the token
      const data = await googleLogin(credential);
      
      if (onSuccess) {
        onSuccess(data);
      } else {
        // Default behavior: navigate to dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Google login error:', error);
      if (onError) {
        onError(error.message);
      }
    }
  };

  const login = useGoogleLogin({
    onSuccess: handleGoogleLoginSuccess,
    onError: (error) => {
      console.error('Google login error:', error);
      if (onError) {
        onError('Google login failed. Please try again.');
      }
    },
    flow: 'implicit',
    scope: 'openid email profile', // Request profile scope for picture
  });

  return (
    <Button 
      variant="light" 
      className="google-login-button" 
      onClick={() => login()}
    >
      <FcGoogle size={20} className="google-icon" />
      <span>{buttonText}</span>
    </Button>
  );
};

export default GoogleLoginButton;