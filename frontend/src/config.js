// Environment configuration for the frontend
const config = {
  // API base URL - defaults to empty string for relative paths in production
  API_BASE_URL: process.env.REACT_APP_API_URL || '',
  
  // Socket.IO server URL - defaults to same origin in production
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || '',
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development'
};

export default config;