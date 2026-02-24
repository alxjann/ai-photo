import { createContext, useContext, useState, useCallback } from 'react';

const PhotoContext = createContext();

export const PhotoProvider = ({ children }) => {
  const [photos, setPhotos] = useState([]);

  const appendPhoto = useCallback((newPhoto) => {
    setPhotos((prev) => [...prev, newPhoto]);
  }, []);

  return (
    <PhotoContext.Provider value={{ photos, setPhotos, appendPhoto }}>
      {children}
    </PhotoContext.Provider>
  );
}

export const usePhotoContext = () => useContext(PhotoContext);