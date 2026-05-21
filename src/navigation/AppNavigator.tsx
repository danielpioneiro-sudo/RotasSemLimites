import React from 'react';
import {TouchableOpacity, Text, Image, View, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import RouteScreen from '../screens/RouteScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {Route} from '../types';
import {colors} from '../theme';

export type RootStackParamList = {
  Home: undefined;
  Route: {route: Route};
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeLogo() {
  return (
    <View style={styles.logoContainer}>
      <Image
        source={require('../assets/logo.jpg')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: colors.dark},
          headerTintColor: colors.textOnDark,
          headerTitleStyle: {fontWeight: '700', color: colors.textOnDark},
          contentStyle: {backgroundColor: colors.background},
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({navigation}) => ({
            headerTitle: () => <HomeLogo />,
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                <Text style={{fontSize: 22}}>⚙️</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Route"
          component={RouteScreen}
          options={{title: 'Rota'}}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{title: 'Configurações'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    height: 36,
    width: 180,
  },
});
