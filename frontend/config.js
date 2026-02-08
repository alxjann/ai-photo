import Constants from 'expo-constants';

//for testing only
const getApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3500`;
  }
  return 'http://localhost:3500';
};

export const API_URL = getApiUrl();
