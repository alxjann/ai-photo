import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../config/supabase';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import { getThemeColors } from '../../theme/appColors.js';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const { isDarkMode, setIsDarkMode } = useThemeContext();
  const colors = getThemeColors(isDarkMode);
  const [autoBackup, setAutoBackup] = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)');
          },
        },
      ]
    );
  };

  const SettingsSection = ({ title, children }) => (
    <View className="mb-6">
      <Text className={`text-xs font-semibold uppercase tracking-wide px-4 mb-3 ${colors.sectionTitle}`}>
        {title}
      </Text>
      <View className={`rounded-2xl mx-3 overflow-hidden ${colors.cardBg}`}>
        {children}
      </View>
    </View>
  );

  const SettingsRow = ({ icon, label, value, onPress, rightElement, isLast }) => (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between px-4 py-4 ${colors.rowBg} ${!isLast ? `border-b ${colors.divider}` : ''} ${colors.rowActive}`}
    >
      <View className="flex-row items-center flex-1">
        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${colors.iconBg}`}>
          <Ionicons name={icon} size={18} color={colors.iconColor} />
        </View>
        <Text className={`text-base font-medium ${colors.textPrimary}`}>{label}</Text>
      </View>
      {rightElement || (
        <View className="flex-row items-center">
          {value && <Text className={`mr-2 ${colors.textSecondary}`}>{value}</Text>}
          <Ionicons name="chevron-forward" size={20} color={colors.chevron} />
        </View>
      )}
    </Pressable>
  );

  const ToggleRow = ({ icon, label, value, onValueChange, isLast }) => (
    <View className={`flex-row items-center justify-between px-4 py-4 ${colors.rowBg} ${!isLast ? `border-b ${colors.divider}` : ''}`}>
      <View className="flex-row items-center flex-1">
        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${colors.iconBg}`}>
          <Ionicons name={icon} size={18} color={colors.iconColor} />
        </View>
        <Text className={`text-base font-medium ${colors.textPrimary}`}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <View className={`flex-1 ${colors.pageBg}`}>
      {/* Header */}
      <View className={`pt-16 pb-6 px-4 border-b ${colors.headerBg} ${colors.border}`}>
        <Text className={`text-3xl font-extrabold tracking-tight ${colors.textPrimary}`}>
          Profile
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Account Card */}
        <View className={`mt-6 mx-3 rounded-2xl p-6 mb-6 ${colors.cardBg}`}>
          <View className="items-center">
            <View className={`w-20 h-20 bg-gradient-to-br ${colors.avatarGradient} rounded-full items-center justify-center mb-4`}>
              <Text className="text-white text-3xl font-bold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <Text className={`text-xl font-bold mb-1 ${colors.textPrimary}`}>
              {user?.user_metadata?.full_name || 'User'}
            </Text>
            <Text className={`text-sm ${colors.textSecondary}`}>{user?.email || 'user@example.com'}</Text>
          </View>
        </View>

        {/* Appearance */}
        <SettingsSection title="Appearance">
          <ToggleRow
            icon="moon"
            label="Dark Mode"
            value={isDarkMode}
            onValueChange={setIsDarkMode}
            isLast
          />
        </SettingsSection>

        {/* Storage & Backup */}
        <SettingsSection title="Storage & Backup">
          <SettingsRow
            icon="cloud-upload-outline"
            label="Storage Used"
            value="2.3 GB"
            onPress={() => {}}
          />
          <ToggleRow
            icon="sync"
            label="Auto Backup"
            value={autoBackup}
            onValueChange={setAutoBackup}
          />
          <SettingsRow
            icon="trash-outline"
            label="Clear Cache"
            onPress={() => {
              Alert.alert('Clear Cache', 'This will free up space on your device.');
            }}
            isLast
          />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="Preferences">
          <ToggleRow
            icon="notifications-outline"
            label="Notifications"
            value={notifications}
            onValueChange={setNotifications}
          />
          <SettingsRow
            icon="language-outline"
            label="Language"
            value="English"
            onPress={() => {}}
            isLast
          />
        </SettingsSection>

        {/* Account */}
        <SettingsSection title="Account">
          <SettingsRow
            icon="person-outline"
            label="Edit Profile"
            onPress={() => {}}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy & Security"
            onPress={() => {}}
          />
          <SettingsRow
            icon="key-outline"
            label="Change Password"
            onPress={() => {}}
            isLast
          />
        </SettingsSection>

        {/* About */}
        <SettingsSection title="About">
          <SettingsRow
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => {}}
          />
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => {}}
          />
          <SettingsRow
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => {}}
          />
          <SettingsRow
            icon="information-circle-outline"
            label="About"
            value="v1.0.0"
            onPress={() => {}}
            isLast
          />
        </SettingsSection>

        {/* Sign Out Button */}
        <View className="mx-3 mb-8">
          <Pressable
            onPress={handleSignOut}
            className="rounded-2xl px-4 py-4"
            //className="bg-red-50 rounded-2xl px-4 py-4 active:bg-red-100"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text className="text-red-600 font-semibold text-base ml-2">Sign Out</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

