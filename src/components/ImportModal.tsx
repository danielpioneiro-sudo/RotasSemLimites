import React, {useState, useEffect, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import {
  pickAndParse,
  rowsToStops,
  ColumnMapping,
  ParsedFile,
} from '../services/importService';
import {Stop} from '../types';
import {colors} from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImport: (stops: Stop[]) => void;
}

type Phase = 'loading' | 'mapping' | 'error';

const NOT_USED = '— não usar —';

export default function ImportModal({visible, onClose, onImport}: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [latCol, setLatCol] = useState<string>('');
  const [lngCol, setLngCol] = useState<string>('');
  const [nameCol, setNameCol] = useState<string>(NOT_USED);
  const [addrCol, setAddrCol] = useState<string>(NOT_USED);
  const [errorMsg, setErrorMsg] = useState('');
  // Garante que o picker é aberto uma única vez por exibição do modal
  const pickingRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      pickingRef.current = false;
      return;
    }
    if (pickingRef.current) return;
    pickingRef.current = true;
    setPhase('loading');
    setParsed(null);
    pickAndParse()
      .then(result => {
        pickingRef.current = false;
        if (!result) {
          onClose();
          return;
        }
        setParsed(result);
        setLatCol(result.autoMapping.latCol ?? '');
        setLngCol(result.autoMapping.lngCol ?? '');
        setNameCol(result.autoMapping.nameCol ?? NOT_USED);
        setAddrCol(result.autoMapping.addressCol ?? NOT_USED);
        setPhase('mapping');
      })
      .catch(e => {
        pickingRef.current = false;
        setErrorMsg(e?.message ?? 'Erro ao ler o arquivo.');
        setPhase('error');
      });
  }, [visible]);

  const pickColumn = (
    current: string,
    allowEmpty: boolean,
    title: string,
    onPick: (col: string) => void,
  ) => {
    if (!parsed) return;
    const opts = allowEmpty
      ? [NOT_USED, ...parsed.headers]
      : parsed.headers;
    ActionSheetIOS.showActionSheetWithOptions(
      {title, options: ['Cancelar', ...opts], cancelButtonIndex: 0},
      i => {
        if (i > 0) onPick(opts[i - 1]);
      },
    );
  };

  const handleImport = () => {
    if (!parsed || !latCol || !lngCol) {
      Alert.alert('Atenção', 'Selecione as colunas de Latitude e Longitude.');
      return;
    }
    const mapping: ColumnMapping = {
      latCol,
      lngCol,
      nameCol: nameCol === NOT_USED ? null : nameCol,
      addressCol: addrCol === NOT_USED ? null : addrCol,
    };
    const stops = rowsToStops(parsed.rows, mapping);
    if (stops.length === 0) {
      Alert.alert('Nenhuma parada válida', 'Verifique se as colunas de lat/lng contêm coordenadas numéricas válidas.');
      return;
    }
    onImport(stops);
  };

  // Preview: 3 primeiras linhas válidas
  const preview = parsed
    ? parsed.rows.slice(0, 3).map((row, i) => ({
        name: (nameCol !== NOT_USED ? row[nameCol] : '') || `Linha ${i + 2}`,
        lat: row[latCol] ?? '—',
        lng: row[lngCol] ?? '—',
      }))
    : [];

  const ColSelector = ({
    label,
    value,
    allowEmpty,
    onPick,
  }: {
    label: string;
    value: string;
    allowEmpty: boolean;
    onPick: (v: string) => void;
  }) => (
    <View style={styles.colRow}>
      <Text style={styles.colLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.colPicker, !value && !allowEmpty && styles.colPickerEmpty]}
        onPress={() => pickColumn(value, allowEmpty, `Coluna: ${label}`, onPick)}>
        <Text
          style={[
            styles.colPickerTxt,
            (!value || value === NOT_USED) && styles.colPickerHint,
          ]}
          numberOfLines={1}>
          {value || 'Selecionar coluna...'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Importar Planilha</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTxt}>Lendo arquivo...</Text>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.center}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTxt}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onClose}>
              <Text style={styles.retryTxt}>Fechar</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'mapping' && parsed && (
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

            {/* Resumo do arquivo */}
            <View style={styles.fileInfo}>
              <Text style={styles.fileInfoTxt}>
                📄 {parsed.rows.length} linha{parsed.rows.length !== 1 ? 's' : ''} encontrada{parsed.rows.length !== 1 ? 's' : ''} · {parsed.headers.length} colunas
              </Text>
            </View>

            {/* Mapeamento de colunas */}
            <Text style={styles.sectionTitle}>Mapeamento de colunas</Text>
            <View style={styles.card}>
              <ColSelector
                label="Latitude *"
                value={latCol}
                allowEmpty={false}
                onPick={setLatCol}
              />
              <ColSelector
                label="Longitude *"
                value={lngCol}
                allowEmpty={false}
                onPick={setLngCol}
              />
              <ColSelector
                label="Nome da parada"
                value={nameCol}
                allowEmpty
                onPick={setNameCol}
              />
              <ColSelector
                label="Endereço"
                value={addrCol}
                allowEmpty
                onPick={setAddrCol}
              />
            </View>

            {/* Preview */}
            {latCol && lngCol && (
              <>
                <Text style={styles.sectionTitle}>Prévia (primeiras 3 linhas)</Text>
                <View style={styles.card}>
                  {preview.map((p, i) => (
                    <View key={i} style={[styles.previewRow, i > 0 && styles.previewRowBorder]}>
                      <View style={styles.previewBadge}>
                        <Text style={styles.previewBadgeTxt}>{i + 1}</Text>
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.previewName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.previewCoord}>{p.lat}, {p.lng}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Botão importar */}
            <TouchableOpacity
              style={[styles.importBtn, (!latCol || !lngCol) && styles.importBtnDisabled]}
              onPress={handleImport}
              disabled={!latCol || !lngCol}>
              <Text style={styles.importBtnTxt}>
                Importar {parsed.rows.length} parada{parsed.rows.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>

          </ScrollView>
        )}
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
  cancel: {fontSize: 16, color: colors.primary},

  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
  loadingTxt: {fontSize: 15, color: colors.textSecondary},
  errorIcon: {fontSize: 48},
  errorTxt: {fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32},
  retryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 10, marginTop: 8,
  },
  retryTxt: {color: '#fff', fontWeight: '700'},

  body: {padding: 16, gap: 8},
  fileInfo: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  fileInfoTxt: {fontSize: 13, color: colors.primary, fontWeight: '600'},

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  colRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colLabel: {width: 130, fontSize: 14, color: colors.text},
  colPicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  colPickerEmpty: {borderWidth: 1.5, borderColor: colors.danger},
  colPickerTxt: {flex: 1, fontSize: 13, color: colors.text},
  colPickerHint: {color: colors.textHint},
  chevron: {fontSize: 18, color: colors.textHint, marginLeft: 4},

  previewRow: {flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10},
  previewRowBorder: {borderTopWidth: 1, borderTopColor: colors.border},
  previewBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  previewBadgeTxt: {color: '#fff', fontSize: 11, fontWeight: '700'},
  previewName: {fontSize: 13, fontWeight: '500', color: colors.text},
  previewCoord: {fontSize: 11, color: colors.textSecondary, marginTop: 1},

  importBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  importBtnDisabled: {backgroundColor: colors.border},
  importBtnTxt: {color: '#fff', fontSize: 16, fontWeight: '700'},
});
