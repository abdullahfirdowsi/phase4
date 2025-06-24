import React from 'react';
import { githubLogin } from '../../api';
import { useNavigate } from 'react-router-dom';

const GitHubOAuth = ({ onSuccess, onError }) => {
  const navigate = useNavigate();

  const handleGithubLogin = () => {
    const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID || "your-github-client-id";
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const scope = "user:email";
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = githubAuthUrl;
  };

  const handleGithubCallback = async (code) => {
    try {
      const data = await githubLogin(code);
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

  return { handleGithubLogin, handleGithubCallback };
};

export default GitHubOAuth;