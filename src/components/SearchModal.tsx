import React, {useState, useCallback, useRef} from 'react';
import {
  Modal,
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {searchLocations} from '../native/LocalSearch';
import {SearchResult} from '../types';
import {colors} from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
}

export default function SearchModal({visible, onClose, onSelect}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (text.trim().length < 3) {
      setResults([]);
      setSearched(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchLocations(text);
        setResults(res);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleSelect = (item: SearchResult) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Text style={styles.title}>Adicionar Parada</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o endereço ou nome do local..."
              placeholderTextColor={colors.textHint}
              value={query}
              onChangeText={handleChangeText}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => handleChangeText('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading && (
            <ActivityIndicator
              style={styles.loader}
              color={colors.primary}
              size="small"
            />
          )}

          {!loading && searched && results.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhum resultado encontrado</Text>
            </View>
          )}

          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}>
                <Text style={styles.pin}>📍</Text>
                <View style={styles.resultText}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.address ? (
                    <Text style={styles.resultAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {flex: 1, backgroundColor: colors.surface},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {fontSize: 17, fontWeight: '600', color: colors.text},
  closeBtn: {padding: 4},
  closeTxt: {fontSize: 16, color: colors.primary},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {fontSize: 16, marginRight: 8},
  input: {flex: 1, fontSize: 16, color: colors.text},
  clearBtn: {fontSize: 14, color: colors.textHint, padding: 4},
  loader: {marginTop: 20},
  empty: {alignItems: 'center', marginTop: 40},
  emptyText: {color: colors.textSecondary, fontSize: 15},
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pin: {fontSize: 18, marginRight: 12},
  resultText: {flex: 1},
  resultName: {fontSize: 15, fontWeight: '500', color: colors.text},
  resultAddress: {fontSize: 13, color: colors.textSecondary, marginTop: 2},
  separator: {height: 1, backgroundColor: colors.border, marginLeft: 46},
});
