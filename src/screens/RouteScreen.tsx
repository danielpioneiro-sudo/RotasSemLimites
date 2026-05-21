import React, {
  useState,
  useCallback,
  useLayoutEffect,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import MapView, {Marker, Polyline, Callout, Region} from 'react-native-maps';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';
import {Route, Stop} from '../types';
import {saveRoute} from '../services/storage';
import {loadSettings} from '../services/settings';
import {openStopInApp, NavApp} from '../services/navApps';
import SearchModal from '../components/SearchModal';
import ImportModal from '../components/ImportModal';
import OptimizeModal from '../components/OptimizeModal';
import {colors} from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Route'>;

export default function RouteScreen({route, navigation}: Props) {
  const {height: screenH} = useWindowDimensions();
  const mapH = Math.round(screenH * 0.44);
  // listH medido pelo onLayout do container real — sem adivinhação
  const [listH, setListH] = useState(0);

  const [currentRoute, setCurrentRoute] = useState<Route>(route.params.route);
  const [showSearch, setShowSearch] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showOptimize, setShowOptimize] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentRoute.name);

  // Modo navegação
  const [navMode, setNavMode] = useState(false);
  const [navIndex, setNavIndex] = useState(0);
  const [navApp, setNavApp] = useState<NavApp>('ask');

  const mapRef = useRef<MapView>(null);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(s => setNavApp(s.navApp));
    }, []),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: currentRoute.name,
      headerRight: navMode
        ? () => (
            <TouchableOpacity onPress={handleCancelNav} style={{marginRight: 4}}>
              <Text style={{color: '#fff', fontSize: 14}}>✕ Cancelar</Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [currentRoute.name, navMode]);

  const fitMap = useCallback((stops: Stop[]) => {
    if (!mapRef.current || stops.length === 0) return;
    if (stops.length === 1) {
      mapRef.current.animateToRegion(
        {latitude: stops[0].latitude, longitude: stops[0].longitude, latitudeDelta: 0.02, longitudeDelta: 0.02},
        500,
      );
      return;
    }
    mapRef.current.fitToCoordinates(
      stops.map(s => ({latitude: s.latitude, longitude: s.longitude})),
      {edgePadding: {top: 70, right: 50, bottom: 50, left: 50}, animated: true},
    );
  }, []);

  const focusStop = useCallback((stop: Stop) => {
    mapRef.current?.animateToRegion(
      {latitude: stop.latitude, longitude: stop.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01},
      400,
    );
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fitMap(currentRoute.stops), 700);
    return () => clearTimeout(t);
  }, []);

  const persist = useCallback(async (updated: Route) => {
    setCurrentRoute(updated);
    await saveRoute(updated);
  }, []);

  const handleAddStop = useCallback(
    async (result: {name: string; address: string; latitude: number; longitude: number}) => {
      const stop: Stop = {
        id: `${Date.now()}-${Math.random()}`,
        name: result.name,
        address: result.address,
        latitude: result.latitude,
        longitude: result.longitude,
      };
      const updated = {...currentRoute, stops: [...currentRoute.stops, stop], updatedAt: Date.now()};
      await persist(updated);
      setShowSearch(false);
      setTimeout(() => fitMap(updated.stops), 300);
    },
    [currentRoute, persist, fitMap],
  );

  const handleRemoveStop = useCallback(
    (id: string) => {
      Alert.alert('Remover Parada', 'Deseja remover esta parada?', [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const updated = {...currentRoute, stops: currentRoute.stops.filter(s => s.id !== id), updatedAt: Date.now()};
            await persist(updated);
            setTimeout(() => fitMap(updated.stops), 300);
          },
        },
      ]);
    },
    [currentRoute, persist, fitMap],
  );

  const handleReorder = useCallback(
    async (data: Stop[]) => {
      await persist({...currentRoute, stops: data, updatedAt: Date.now()});
    },
    [currentRoute, persist],
  );

  const handleSaveName = useCallback(async () => {
    const name = nameInput.trim() || 'Rota sem nome';
    setEditingName(false);
    await persist({...currentRoute, name, updatedAt: Date.now()});
    navigation.setOptions({title: name});
  }, [nameInput, currentRoute, persist, navigation]);

  // ── Otimizar rota ─────────────────────────────────────────────────────────

  const handleOptimize = useCallback(() => {
    if (currentRoute.stops.length < 3) {
      Alert.alert('Paradas insuficientes', 'Adicione ao menos 3 paradas para otimizar.');
      return;
    }
    setShowOptimize(true);
  }, [currentRoute.stops.length]);

  const handleApplyOptimize = useCallback(
    async (optimized: Stop[]) => {
      setShowOptimize(false);
      await persist({...currentRoute, stops: optimized, updatedAt: Date.now()});
      setTimeout(() => fitMap(optimized), 300);
    },
    [currentRoute, persist, fitMap],
  );

  // ── Importar planilha ──────────────────────────────────────────────────────

  const handleImport = useCallback(
    async (importedStops: Stop[]) => {
      const merged = [...currentRoute.stops, ...importedStops];
      await persist({...currentRoute, stops: merged, updatedAt: Date.now()});
      setShowImport(false);
      setTimeout(() => fitMap(merged), 400);
      Alert.alert(
        'Importação concluída',
        `${importedStops.length} parada${importedStops.length !== 1 ? 's' : ''} adicionada${importedStops.length !== 1 ? 's' : ''} à rota.`,
      );
    },
    [currentRoute, persist, fitMap],
  );

  // ── Navegação sequencial ──────────────────────────────────────────────────

  const handleStartNav = useCallback(async () => {
    if (currentRoute.stops.length === 0) return;
    setNavMode(true);
    setNavIndex(0);
    focusStop(currentRoute.stops[0]);
    await openStopInApp(currentRoute.stops[0], navApp);
  }, [currentRoute.stops, navApp, focusStop]);

  const handleNextStop = useCallback(async () => {
    const next = navIndex + 1;
    if (next >= currentRoute.stops.length) {
      Alert.alert('Rota concluída!', 'Você passou por todas as paradas.', [
        {text: 'OK', onPress: () => { setNavMode(false); setNavIndex(0); }},
      ]);
      return;
    }
    setNavIndex(next);
    focusStop(currentRoute.stops[next]);
    await openStopInApp(currentRoute.stops[next], navApp);
  }, [navIndex, currentRoute.stops, navApp, focusStop]);

  const handleCancelNav = useCallback(() => {
    setNavMode(false);
    setNavIndex(0);
    fitMap(currentRoute.stops);
  }, [currentRoute.stops, fitMap]);

  // ─────────────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({item, drag, isActive, getIndex}: RenderItemParams<Stop>) => {
      const index = getIndex() ?? 0;
      const isDone = navMode && index < navIndex;
      const isCurrent = navMode && index === navIndex;
      return (
        <ScaleDecorator>
          <View
            style={[
              styles.stopItem,
              isActive && styles.stopItemDragging,
              isCurrent && styles.stopItemCurrent,
              isDone && styles.stopItemDone,
            ]}>
            {!navMode && (
              <TouchableOpacity onLongPress={drag} delayLongPress={150} style={styles.dragHandle}>
                <Text style={styles.dragIcon}>⠿</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.stopContent}
              onPress={() => {
                focusStop(item);
                if (isDone && navMode) {
                  Alert.alert(
                    item.name,
                    'O que deseja fazer com esta parada?',
                    [
                      {text: 'Cancelar', style: 'cancel'},
                      {
                        text: 'Navegar até ela',
                        onPress: () => openStopInApp(item, navApp),
                      },
                      {
                        text: 'Retomar daqui',
                        onPress: () => {
                          setNavIndex(index);
                          openStopInApp(item, navApp);
                        },
                      },
                    ],
                  );
                }
              }}
              activeOpacity={0.7}>
              <View style={[
                styles.badge,
                isCurrent && styles.badgeCurrent,
                isDone && styles.badgeDone,
              ]}>
                {isDone
                  ? <Text style={styles.badgeText}>✓</Text>
                  : <Text style={styles.badgeText}>{index + 1}</Text>
                }
              </View>
              <View style={styles.stopInfo}>
                <Text style={[styles.stopName, isDone && styles.stopNameDone]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.address ? (
                  <Text style={styles.stopAddress} numberOfLines={1}>{item.address}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
            {!navMode && (
              <TouchableOpacity
                onPress={() => handleRemoveStop(item.id)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                style={styles.removeBtn}>
                <Text style={styles.removeIcon}>✕</Text>
              </TouchableOpacity>
            )}
            {isCurrent && (
              <Text style={styles.currentArrow}>▶</Text>
            )}
          </View>
        </ScaleDecorator>
      );
    },
    [navMode, navIndex, navApp, focusStop, handleRemoveStop],
  );

  const polylineCoords = currentRoute.stops.map(s => ({latitude: s.latitude, longitude: s.longitude}));

  const initialRegion: Region = {
    latitude: -14.235, longitude: -51.925,
    latitudeDelta: 30, longitudeDelta: 30,
  };

  const isLastStop = navIndex === currentRoute.stops.length - 1;

  return (
    <View style={styles.container}>

      {/* ── MAPA ────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={[styles.map, {height: mapH}]}
        initialRegion={initialRegion}
        showsUserLocation
        showsCompass>

        {polylineCoords.length >= 2 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={colors.primary}
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        )}

        {currentRoute.stops.map((stop, index) => {
          const isDone = navMode && index < navIndex;
          const isCurrent = navMode && index === navIndex;
          return (
            <Marker
              key={stop.id}
              coordinate={{latitude: stop.latitude, longitude: stop.longitude}}
              anchor={{x: 0.5, y: 1}}>

              {/* Bolha do marcador */}
              <View style={styles.markerWrapper}>
                <View style={[
                  styles.markerBubble,
                  isCurrent && styles.markerBubbleCurrent,
                  isDone && styles.markerBubbleDone,
                ]}>
                  <Text style={styles.markerNumber}>
                    {isDone ? '✓' : index + 1}
                  </Text>
                </View>
                <View style={[
                  styles.markerTail,
                  isCurrent && styles.markerTailCurrent,
                  isDone && styles.markerTailDone,
                ]} />
              </View>

              {/* Callout com endereço ao tocar */}
              <Callout tooltip>
                <View style={styles.callout}>
                  <Text style={styles.calloutIndex}>Parada {index + 1}</Text>
                  <Text style={styles.calloutName}>{stop.name}</Text>
                  {stop.address ? (
                    <Text style={styles.calloutAddress}>{stop.address}</Text>
                  ) : null}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Botão ajustar mapa */}
      {currentRoute.stops.length > 0 && (
        <TouchableOpacity
          style={[styles.fitBtn, {top: mapH - 44}]}
          onPress={() => fitMap(currentRoute.stops)}>
          <Text style={styles.fitBtnText}>⊡ Ver todas</Text>
        </TouchableOpacity>
      )}

      {/* ── PAINEL ──────────────────────────────────────────────────── */}
      <View style={styles.panel}>

        {/* Cabeçalho */}
        <View style={styles.panelHeader}>
          {editingName && !navMode ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                onBlur={handleSaveName}
                onSubmitEditing={handleSaveName}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={handleSaveName} style={styles.saveNameBtn}>
                <Text style={styles.saveNameTxt}>OK</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => !navMode && (() => { setNameInput(currentRoute.name); setEditingName(true); })()}
              disabled={navMode}>
              <Text style={styles.routeName} numberOfLines={1}>{currentRoute.name}</Text>
              <Text style={styles.stopCount}>
                {currentRoute.stops.length} parada{currentRoute.stops.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}

          {!navMode && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowSearch(true)}>
              <Text style={styles.addBtnTxt}>+ Parada</Text>
            </TouchableOpacity>
          )}

          {navMode && (
            <View style={styles.navCounter}>
              <Text style={styles.navCounterTxt}>
                {navIndex + 1} / {currentRoute.stops.length}
              </Text>
            </View>
          )}
        </View>

        {/* Barra de ações rápidas — só no modo normal */}
        {!navMode && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.actionBtn, currentRoute.stops.length < 3 && styles.actionBtnOff]}
              onPress={handleOptimize}
              disabled={currentRoute.stops.length < 3}>
              <Text style={styles.actionBtnTxt}>⚡ Otimizar</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowImport(true)}>
              <Text style={styles.actionBtnTxt}>📥 Importar planilha</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hint ou info da parada atual */}
        <View style={styles.hintBar}>
          {navMode ? (
            <View style={styles.currentStopBar}>
              <Text style={styles.currentStopLabel}>Destino atual:</Text>
              <Text style={styles.currentStopName} numberOfLines={1}>
                {currentRoute.stops[navIndex]?.name}
              </Text>
            </View>
          ) : (
            currentRoute.stops.length >= 2 && (
              <Text style={styles.dragHint}>Segure ⠿ e arraste para reordenar</Text>
            )
          )}
        </View>

        {/* Lista — mede o espaço disponível via onLayout */}
        <View
          style={styles.listContainer}
          onLayout={(e: LayoutChangeEvent) => {
            const h = Math.floor(e.nativeEvent.layout.height);
            if (h > 0) setListH(h);
          }}>
          {listH > 0 && (
            currentRoute.stops.length === 0 ? (
              <View style={[styles.emptyState, {height: listH}]}>
                <Text style={styles.emptyText}>
                  Toque em "+ Parada" para adicionar locais ao mapa
                </Text>
              </View>
            ) : (
              <DraggableFlatList
                data={currentRoute.stops}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                onDragEnd={({data}) => handleReorder(data)}
                style={{height: listH}}
                contentContainerStyle={styles.listContent}
              />
            )
          )}
        </View>

        {/* Botão principal */}
        <View style={styles.bottomBtn}>
          {!navMode ? (
            <TouchableOpacity
              style={[styles.btn, currentRoute.stops.length === 0 && styles.btnDisabled]}
              onPress={handleStartNav}
              disabled={currentRoute.stops.length === 0}>
              <Text style={styles.btnTxt}>▶ Iniciar Rota</Text>
            </TouchableOpacity>
          ) : isLastStop ? (
            <TouchableOpacity style={[styles.btn, styles.btnFinish]} onPress={handleNextStop}>
              <Text style={styles.btnTxt}>✓ Concluir Rota</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.btn, styles.btnNext]} onPress={handleNextStop}>
              <Text style={styles.btnTxt}>Próxima Parada ▶</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onSelect={handleAddStop}
      />
      <ImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />
      <OptimizeModal
        visible={showOptimize}
        stops={currentRoute.stops}
        onClose={() => setShowOptimize(false)}
        onApply={handleApplyOptimize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  map: {width: '100%'},

  fitBtn: {
    position: 'absolute',
    right: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fitBtnText: {fontSize: 12, color: colors.primary, fontWeight: '600'},

  // ── Marcadores ───────────────────────────────────────────────────────────
  markerWrapper: {alignItems: 'center'},
  markerBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  markerBubbleCurrent: {backgroundColor: '#E53935', width: 48, height: 48, borderRadius: 24},
  markerBubbleDone: {backgroundColor: '#9E9E9E'},
  markerNumber: {color: '#fff', fontWeight: '800', fontSize: 16},
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: colors.primary,
    marginTop: -1,
  },
  markerTailCurrent: {borderTopColor: '#E53935'},
  markerTailDone: {borderTopColor: '#9E9E9E'},

  // ── Callout ──────────────────────────────────────────────────────────────
  callout: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    minWidth: 180,
    maxWidth: 260,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  calloutIndex: {fontSize: 11, color: colors.primary, fontWeight: '700', marginBottom: 2},
  calloutName: {fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2},
  calloutAddress: {fontSize: 12, color: colors.textSecondary},

  // ── Painel ───────────────────────────────────────────────────────────────
  panel: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  nameRow: {flex: 1},
  routeName: {fontSize: 15, fontWeight: '700', color: colors.text},
  stopCount: {fontSize: 12, color: colors.textSecondary},
  nameEditRow: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6},
  nameInput: {
    flex: 1, fontSize: 15, fontWeight: '600', color: colors.text,
    borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: 2,
  },
  saveNameBtn: {
    backgroundColor: colors.primary, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  saveNameTxt: {color: '#fff', fontWeight: '700', fontSize: 13},
  addBtn: {
    backgroundColor: colors.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  addBtnTxt: {color: '#fff', fontWeight: '700', fontSize: 13},
  navCounter: {
    backgroundColor: colors.primaryLight, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  navCounterTxt: {color: colors.primary, fontWeight: '700', fontSize: 14},

  actionBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  actionBtn: {flex: 1, paddingVertical: 9, alignItems: 'center'},
  actionBtnOff: {opacity: 0.35},
  actionBtnTxt: {fontSize: 13, fontWeight: '600', color: colors.primary},
  actionDivider: {width: 1, backgroundColor: colors.border},

  hintBar: {justifyContent: 'center', paddingHorizontal: 14},
  dragHint: {fontSize: 11, color: colors.textHint, textAlign: 'center'},
  currentStopBar: {flexDirection: 'row', alignItems: 'center', gap: 6},
  currentStopLabel: {fontSize: 12, color: colors.textSecondary},
  currentStopName: {
    flex: 1, fontSize: 14, fontWeight: '700',
    color: '#E53935',
  },

  listContent: {paddingVertical: 2},
  stopItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  stopItemDragging: {
    backgroundColor: '#FFF3E0',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
  },
  stopItemCurrent: {backgroundColor: '#FFF3F3'},
  stopItemDone: {backgroundColor: '#F8F8F8'},

  dragHandle: {paddingHorizontal: 12, paddingVertical: 14, alignItems: 'center'},
  dragIcon: {fontSize: 20, color: '#CCC'},
  stopContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingRight: 4,
  },
  badge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  badgeCurrent: {backgroundColor: '#E53935'},
  badgeDone: {backgroundColor: '#9E9E9E'},
  badgeText: {color: '#fff', fontSize: 12, fontWeight: '700'},
  stopInfo: {flex: 1},
  stopName: {fontSize: 14, fontWeight: '500', color: colors.text},
  stopNameDone: {color: '#AAA', textDecorationLine: 'line-through'},
  stopAddress: {fontSize: 11, color: colors.textSecondary, marginTop: 1},
  removeBtn: {paddingHorizontal: 12, paddingVertical: 14},
  removeIcon: {fontSize: 14, color: '#CCC'},
  currentArrow: {fontSize: 14, color: '#E53935', paddingRight: 12, fontWeight: '700'},

  listContainer: {flex: 1},
  emptyState: {alignItems: 'center', justifyContent: 'center', padding: 24},
  emptyText: {fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20},

  bottomBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 14, paddingVertical: 13, alignItems: 'center',
  },
  btnDisabled: {backgroundColor: colors.border},
  btnNext: {backgroundColor: '#E53935'},
  btnFinish: {backgroundColor: colors.success},
  btnTxt: {color: '#fff', fontSize: 15, fontWeight: '700'},
});
