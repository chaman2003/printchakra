import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {StatusBar, StyleSheet} from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import DocumentUploadScreen from './src/screens/DocumentUploadScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import DocumentDetailScreen from './src/screens/DocumentDetailScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2196F3',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{title: 'PrintChakra Login'}}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{title: 'PrintChakra'}}
          />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{title: 'Scan Document'}}
          />
          <Stack.Screen
            name="DocumentUpload"
            component={DocumentUploadScreen}
            options={{title: 'Upload Documents'}}
          />
          <Stack.Screen
            name="Documents"
            component={DocumentsScreen}
            options={{title: 'My Documents'}}
          />
          <Stack.Screen
            name="DocumentDetail"
            component={DocumentDetailScreen}
            options={{title: 'Document Details'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default App;
