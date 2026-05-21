import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {Route} from '../types';
import {loadRoutes, deleteRoute} from '../services/storage';
import {colors} from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({navigation}: Props) {
  const [routes, setRoutes] = useState<Route[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadRoutes().then(setRoutes);
    }, []),
  );

  const handleNewRoute = useCallback(() => {
    const newRoute: Route = {
      id: `${Date.now()}-${Math.random()}`,
      name: `Rota ${routes.length + 1}`,
      stops: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    navigation.navigate('Route', {route: newRoute});
  }, [routes.length, navigation]);

  const handleDeleteRoute = useCallback(
    (id: string, name: string) => {
      Alert.alert('Excluir Rota', `Deseja excluir "${name}"?`, [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteRoute(id);
            setRoutes(prev => prev.filter(r => r.id !== id));
          },
        },
      ]);
    },
    [],
  );

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const renderItem = ({item}: {item: Route}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Route', {route: item})}
      activeOpacity={0.8}>
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>🗺️</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardMeta}>
          {item.stops.length} parada{item.stops.length !== 1 ? 's' : ''} • {formatDate(item.updatedAt)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleDeleteRoute(item.id, item.name)}
        style={styles.deleteBtn}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {routes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>Nenhuma rota salva</Text>
          <Text style={styles.emptySubtitle}>
            Crie sua primeira rota tocando no botão abaixo
          </Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.newBtn} onPress={handleNewRoute}>
          <Text style={styles.newBtnText}>+ Nova Rota</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  list: {padding: 12, paddingBottom: 16},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardIconText: {fontSize: 22},
  cardContent: {flex: 1},
  cardName: {fontSize: 16, fontWeight: '600', color: colors.text},
  cardMeta: {fontSize: 13, color: colors.textSecondary, marginTop: 3},
  deleteBtn: {padding: 4},
  deleteIcon: {fontSize: 18},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100},
  emptyIcon: {fontSize: 60, marginBottom: 16},
  emptyTitle: {fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8},
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  newBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  newBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});
