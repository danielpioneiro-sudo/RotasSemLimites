import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {loadSettings, saveSettings} from '../services/settings';
import {NavApp, NAV_APP_LABELS} from '../services/navApps';
import {colors} from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const NAV_OPTIONS: NavApp[] = ['ask', 'waze', 'googlemaps', 'applemaps'];

const NAV_APP_ICONS: Record<NavApp, string> = {
  ask: '❓',
  waze: '🚗',
  googlemaps: '🗺️',
  applemaps: '🍎',
};

export default function SettingsScreen({navigation}: Props) {
  const [selected, setSelected] = useState<NavApp | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(s => setSelected(s.navApp));
    }, []),
  );

  const handleSelect = async (app: NavApp) => {
    setSelected(app);
    await saveSettings({navApp: app});
  };

  if (!selected) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{marginTop: 40}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aplicativo de navegação padrão</Text>
        <Text style={styles.sectionDesc}>
          Escolha qual app abre ao iniciar a navegação para cada parada.
        </Text>

        {NAV_OPTIONS.map(app => (
          <TouchableOpacity
            key={app}
            style={[styles.option, selected === app && styles.optionSelected]}
            onPress={() => handleSelect(app)}
            activeOpacity={0.7}>
            <Text style={styles.optionIcon}>{NAV_APP_ICONS[app]}</Text>
            <View style={styles.optionText}>
              <Text
                style={[
                  styles.optionLabel,
                  selected === app && styles.optionLabelSelected,
                ]}>
                {NAV_APP_LABELS[app]}
              </Text>
              {app === 'ask' && (
                <Text style={styles.optionSub}>
                  Pergunta qual app usar a cada parada
                </Text>
              )}
            </View>
            {selected === app && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  section: {
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    padding: 16,
    paddingBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  optionSelected: {backgroundColor: colors.primaryLight},
  optionIcon: {fontSize: 24, marginRight: 14},
  optionText: {flex: 1},
  optionLabel: {fontSize: 16, color: colors.text},
  optionLabelSelected: {color: colors.primary, fontWeight: '600'},
  optionSub: {fontSize: 12, color: colors.textSecondary, marginTop: 2},
  checkmark: {fontSize: 18, color: colors.primary, fontWeight: '700'},
});
