import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ApiService from '../services/ApiService';

const HomeScreen = ({navigation}) => {
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await ApiService.logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const menuItems = [
    {
      title: 'Scan Document',
      subtitle: 'Capture and process new documents',
      icon: 'camera-alt',
      color: '#2196F3',
      onPress: () => navigation.navigate('Camera'),
    },
    {
      title: 'Upload Files',
      subtitle: 'Upload PDFs and images from device',
      icon: 'cloud-upload',
      color: '#FF5722',
      onPress: () => navigation.navigate('DocumentUpload'),
    },
    {
      title: 'My Documents',
      subtitle: 'View and manage scanned documents',
      icon: 'folder',
      color: '#4CAF50',
      onPress: () => navigation.navigate('Documents'),
    },
    {
      title: 'Search',
      subtitle: 'Search through document content',
      icon: 'search',
      color: '#FF9800',
      onPress: () => navigation.navigate('Documents', {showSearch: true}),
    },
    {
      title: 'Settings',
      subtitle: 'App preferences and account',
      icon: 'settings',
      color: '#9C27B0',
      onPress: () => {
        Alert.alert('Settings', 'Settings screen coming soon!');
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PrintChakra</Text>
        <Text style={styles.subtitle}>Document Scanner & OCR</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={20} color="#666" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}>
            <View style={[styles.iconContainer, {backgroundColor: item.color}]}>
              <Icon name={item.icon} size={30} color="#ffffff" />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          PrintChakra MVP v1.0 - Offline Document Processing
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  logoutButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  menuItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default HomeScreen;
