import { View, Text, Pressable, Animated } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { takePhoto } from 'service/photoService';
import { useRouter } from 'expo-router';
import { usePhotoContext } from 'context/PhotoContext';
import { useThemeContext } from 'context/ThemeContext.jsx';
import { getThemeColors } from 'theme/appColors.js';

export default function FloatingMenu({ menuAnim }) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const { appendPhoto } = usePhotoContext();
  const { isDarkMode } = useThemeContext();
  const colors = getThemeColors(isDarkMode);

  const handleTakePhoto = async () => {
    const newPhoto = await takePhoto();
    if (newPhoto) {
      toggleMenu();
      appendPhoto(newPhoto);
    }
  }

  const handleUploadPhoto = () => {
    toggleMenu();
    router.push('/upload');
  };

  const toggleMenu = () => {
    const toValue = menuVisible ? 0 : 1;
    if (!menuVisible) setMenuVisible(true);

    Animated.spring(menuAnim, {
      toValue: toValue,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start(() => { 
      if (toValue === 0) 
        setMenuVisible(false); 
    });
  };

  const menuStyle = {
    opacity: menuAnim,
    transform: [
      { scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
      { translateY: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }
    ],
  };

  const iconRotation = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* menu */}
      {menuVisible && (
        <Animated.View 
          style={[menuStyle]} 
          className={`absolute bottom-28 right-8 w-56 rounded-2xl border shadow-xl overflow-hidden ${colors.menuBg} ${colors.menuBorder}`}
        >
          <Pressable onPress={handleTakePhoto} className={`flex-row items-center justify-between p-4 border-b ${colors.rowBorder} ${colors.rowActive}`}>
            <Text className={`text-lg ${colors.text}`}>Take Photo</Text>
            <Ionicons name="camera-outline" size={22} color={colors.icon} />
          </Pressable>
          <Pressable onPress={handleUploadPhoto} className={`flex-row items-center justify-between p-4 ${colors.rowActive}`}>
            <Text className={`text-lg ${colors.text}`}>Upload Photo</Text>
            <Ionicons name="image-outline" size={22} color={colors.icon} />
          </Pressable>
        </Animated.View>
      )}

      {/* + button */}
      <Pressable 
        onPress={toggleMenu}
        className={`absolute bottom-8 right-8 w-16 h-16 rounded-full items-center justify-center shadow-lg ${colors.fabBg}`}
        style={{ elevation: 5, zIndex: 10 }}
      >
        <Animated.View style={{ transform: [{ rotate: iconRotation }] }}>
          <Ionicons name="add" size={32} color={colors.fabIcon} />
        </Animated.View>
      </Pressable>
    </>
  );
}



