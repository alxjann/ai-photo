import Constants from 'expo-constants';

const getApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000`;
  }
  return 'http://localhost:3000';
};

export const API_URL = 'https://ai-photo-production.up.railway.app';