import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActionSheetIOS,
} from 'react-native';
import {optimizeRoute, OptimizeResult} from '../services/routeOptimizer';
import {Stop} from '../types';
import {colors} from '../theme';

interface Props {
  visible: boolean;
  stops: Stop[];
  onClose: () => void;
  onApply: (optimized: Stop[]) => void;
}

export default function OptimizeModal({visible, stops, onClose, onApply}: Props) {
  const [fixStart, setFixStart] = useState(false);
  const [fixEnd, setFixEnd] = useState(false);
  const [startId, setStartId] = useState<string>('');
  const [endId, setEndId] = useState<string>('');
  const [result, setResult] = useState<OptimizeResult | null>(null);

  // Inicializa com primeira e última parada da rota atual
  useEffect(() => {
    if (visible && stops.length > 0) {
      setStartId(stops[0].id);
      setEndId(stops[stops.length - 1].id);
      setResult(null);
      setFixStart(false);
      setFixEnd(false);
    }
  }, [visible, stops]);

  const stopName = (id: string) =>
    stops.find(s => s.id === id)?.name ?? '—';

  const pickStop = (
    current: string,
    exclude: string | null,
    title: string,
    onPick: (id: string) => void,
  ) => {
    const candidates = stops.filter(s => s.id !== exclude);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: ['Cancelar', ...candidates.map((s, i) => `${i + 1}. ${s.name}`)],
        cancelButtonIndex: 0,
      },
      i => {
        if (i > 0) onPick(candidates[i - 1].id);
      },
    );
  };

  const handleCalculate = () => {
    const r = optimizeRoute(
      stops,
      fixStart ? startId : null,
      fixEnd ? endId : null,
    );
    setResult(r);
  };

  const Toggle = ({
    label,
    active,
    onToggle,
  }: {
    label: string;
    active: boolean;
    onToggle: (v: boolean) => void;
  }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={styles.toggleGroup}>
        <TouchableOpacity
          style={[styles.toggleBtn, !active && styles.toggleBtnActive]}
          onPress={() => { onToggle(false); setResult(null); }}>
          <Text style={[styles.toggleTxt, !active && styles.toggleTxtActive]}>Livre</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, active && styles.toggleBtnActive]}
          onPress={() => { onToggle(true); setResult(null); }}>
          <Text style={[styles.toggleTxt, active && styles.toggleTxtActive]}>Fixar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>⚡ Otimizar Rota</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Fechar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>

          {/* Parada inicial */}
          <View style={styles.card}>
            <Toggle
              label="Parada inicial"
              active={fixStart}
              onToggle={v => { setFixStart(v); setResult(null); }}
            />
            {fixStart && (
              <TouchableOpacity
                style={styles.stopPicker}
                onPress={() =>
                  pickStop(startId, fixEnd ? endId : null, 'Escolher parada inicial', id => {
                    setStartId(id);
                    setResult(null);
                  })
                }>
                <View style={styles.stopPickerBadge}>
                  <Text style={styles.stopPickerBadgeTxt}>
                    {stops.findIndex(s => s.id === startId) + 1}
                  </Text>
                </View>
                <Text style={styles.stopPickerName} numberOfLines={1}>
                  {stopName(startId)}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}
            {!fixStart && (
              <Text style={styles.freeHint}>
                A rota começa pelo ponto mais conveniente
              </Text>
            )}
          </View>

          {/* Parada final */}
          <View style={styles.card}>
            <Toggle
              label="Parada final"
              active={fixEnd}
              onToggle={v => { setFixEnd(v); setResult(null); }}
            />
            {fixEnd && (
              <TouchableOpacity
                style={styles.stopPicker}
                onPress={() =>
                  pickStop(endId, fixStart ? startId : null, 'Escolher parada final', id => {
                    setEndId(id);
                    setResult(null);
                  })
                }>
                <View style={[styles.stopPickerBadge, {backgroundColor: colors.success}]}>
                  <Text style={styles.stopPickerBadgeTxt}>
                    {stops.findIndex(s => s.id === endId) + 1}
                  </Text>
                </View>
                <Text style={styles.stopPickerName} numberOfLines={1}>
                  {stopName(endId)}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}
            {!fixEnd && (
              <Text style={styles.freeHint}>
                A rota termina onde for mais eficiente
              </Text>
            )}
          </View>

          {/* Botão calcular */}
          <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate}>
            <Text style={styles.calcBtnTxt}>Calcular otimização</Text>
          </TouchableOpacity>

          {/* Resultado */}
          {result && (
            <View style={styles.resultCard}>
              {result.savedKm > 0.1 ? (
                <>
                  <Text style={styles.resultIcon}>✅</Text>
                  <Text style={styles.resultTitle}>
                    {result.savedKm.toFixed(1)} km mais curto ({result.savedPct.toFixed(0)}%)
                  </Text>
                  <View style={styles.resultRow}>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultItemLabel}>Antes</Text>
                      <Text style={styles.resultItemValue}>{result.originalKm.toFixed(1)} km</Text>
                    </View>
                    <Text style={styles.resultArrow}>→</Text>
                    <View style={styles.resultItem}>
                      <Text style={styles.resultItemLabel}>Depois</Text>
                      <Text style={[styles.resultItemValue, {color: colors.success}]}>
                        {result.optimizedKm.toFixed(1)} km
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.resultNote}>
                    * Estimativa de distância em linha reta (Haversine)
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.resultIcon}>👌</Text>
                  <Text style={styles.resultTitle}>Rota já está otimizada!</Text>
                  <Text style={styles.resultNote}>
                    Nenhuma melhoria significativa encontrada com esses parâmetros.
                  </Text>
                </>
              )}

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => onApply(result.optimized)}>
                <Text style={styles.applyBtnTxt}>Aplicar nova ordem</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {fontSize: 17, fontWeight: '700', color: colors.text},
  close: {fontSize: 16, color: colors.primary},

  body: {padding: 16, gap: 12},

  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {fontSize: 15, fontWeight: '600', color: colors.text},
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {backgroundColor: colors.surface},
  toggleTxt: {fontSize: 13, color: colors.textSecondary},
  toggleTxtActive: {color: colors.primary, fontWeight: '700'},

  stopPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopPickerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopPickerBadgeTxt: {color: '#fff', fontSize: 12, fontWeight: '700'},
  stopPickerName: {flex: 1, fontSize: 14, fontWeight: '500', color: colors.text},
  chevron: {fontSize: 20, color: colors.textHint},

  freeHint: {fontSize: 12, color: colors.textSecondary, fontStyle: 'italic'},

  calcBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  calcBtnTxt: {color: '#fff', fontSize: 15, fontWeight: '700'},

  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  resultIcon: {fontSize: 40},
  resultTitle: {fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center'},
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 4,
  },
  resultItem: {alignItems: 'center', gap: 2},
  resultItemLabel: {fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase'},
  resultItemValue: {fontSize: 20, fontWeight: '700', color: colors.text},
  resultArrow: {fontSize: 20, color: colors.textHint},
  resultNote: {fontSize: 11, color: colors.textHint, textAlign: 'center'},

  applyBtn: {
    backgroundColor: colors.success,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  applyBtnTxt: {color: '#fff', fontSize: 15, fontWeight: '700'},
});
