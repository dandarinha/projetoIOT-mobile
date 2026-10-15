// App.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  atualizarStatus,
  listarSensores,
  visualizarSensor,
} from './src/api';

const COLORS = {
  background: '#F4F7FB',
  card: '#FFFFFF',
  primary: '#2563EB',
  primarySoft: '#E8F0FF',
  text: '#172033',
  muted: '#6B7280',
  border: '#E4EAF2',
  success: '#16A34A',
  successSoft: '#E8F7ED',
  danger: '#DC2626',
  dangerSoft: '#FDECEC',
};

function getSensorCode(sensor) {
  return String(
    sensor?.codigo ?? sensor?.code ?? sensor?.sensor ?? sensor?.id ?? 'sem-codigo',
  );
}

function getSensorName(sensor) {
  return sensor?.tipo || sensor?.nome || sensor?.name || 'Sensor';
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['true', '1', 'ativo', 'active', 'on'].includes(value.toLowerCase());
  }
  return false;
}

function getSensorStatus(sensor) {
  return toBoolean(sensor?.status ?? sensor?.ativo ?? sensor?.active);
}

function getEnvironment(sensor) {
  return (
    sensor?.ambiente?.nome ||
    sensor?.ambiente ||
    sensor?.environment?.name ||
    sensor?.localizacao ||
    'Ambiente não informado'
  );
}

function normalizeSensor(sensor) {
  return {
    ...sensor,
    _codigo: getSensorCode(sensor),
    _nome: getSensorName(sensor),
    _status: getSensorStatus(sensor),
    _ambiente: getEnvironment(sensor),
  };
}

function StatusBadge({ active }) {
  return (
    <View style={[styles.statusBadge, active ? styles.activeBadge : styles.inactiveBadge]}>
      <View style={[styles.statusDot, { backgroundColor: active ? COLORS.success : COLORS.danger }]} />
      <Text style={[styles.statusText, { color: active ? COLORS.success : COLORS.danger }]}>
        {active ? 'Ativo' : 'Inativo'}
      </Text>
    </View>
  );
}

function SensorRow({ sensor, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sensorRow,
        selected && styles.selectedRow,
        pressed && styles.pressedRow,
      ]}
    >
      <View style={[styles.sensorIcon, selected && styles.selectedSensorIcon]}>
        <Ionicons
          name={sensor._status ? 'radio-outline' : 'radio-button-off-outline'}
          size={18}
          color={selected ? COLORS.primary : sensor._status ? COLORS.success : COLORS.muted}
        />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTitleLine}>
          <Text numberOfLines={1} style={styles.sensorCode}>
            {sensor._codigo}
          </Text>
          <StatusBadge active={sensor._status} />
        </View>
        <Text numberOfLines={1} style={styles.sensorType}>
          {sensor._nome}
        </Text>
        <View style={styles.environmentLine}>
          <Ionicons name="location-outline" size={13} color={COLORS.muted} />
          <Text numberOfLines={1} style={styles.environmentText}>
            {sensor._ambiente}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={17} color={selected ? COLORS.primary : '#AAB5C5'} />
    </Pressable>
  );
}

function DetailPanel({ sensor, onStatusChange, saving }) {
  if (!sensor) {
    return (
      <View style={[styles.detailsCard, styles.emptyDetails]}>
        <Ionicons name="information-circle-outline" size={42} color={COLORS.primary} />
        <Text style={styles.emptyDetailsTitle}>Selecione um sensor</Text>
        <Text style={styles.emptyDetailsText}>
          Toque em um item da lista para visualizar os detalhes aqui.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.detailsScroll}
      contentContainerStyle={styles.detailsContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.detailsHeader}>
        <View style={styles.largeSensorIcon}>
          <Ionicons name="hardware-chip-outline" size={27} color={COLORS.primary} />
        </View>
        <View style={styles.detailsHeaderText}>
          <Text style={styles.detailsEyebrow}>DETALHES DO SENSOR</Text>
          <Text numberOfLines={1} style={styles.detailsTitle}>
            {sensor._codigo}
          </Text>
        </View>
      </View>

      <View style={styles.detailStatusCard}>
        <View>
          <Text style={styles.detailLabel}>Status atual</Text>
          <Text style={styles.detailStatusValue}>
            {sensor._status ? 'Sensor ativo' : 'Sensor inativo'}
          </Text>
        </View>
        {saving ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Switch
            value={sensor._status}
            onValueChange={onStatusChange}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={sensor._status ? COLORS.primary : '#F8FAFC'}
            accessibilityLabel="Alterar status do sensor"
          />
        )}
      </View>

      <View style={styles.detailGrid}>
        <View style={styles.detailItem}>
          <Ionicons name="thermometer-outline" size={20} color={COLORS.primary} />
          <Text style={styles.detailLabel}>Tipo</Text>
          <Text numberOfLines={2} style={styles.detailValue}>{sensor._nome}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={20} color={COLORS.primary} />
          <Text style={styles.detailLabel}>Ambiente</Text>
          <Text numberOfLines={2} style={styles.detailValue}>{sensor._ambiente}</Text>
        </View>
      </View>

      <View style={styles.descriptionBox}>
        <View style={styles.descriptionTitleLine}>
          <Ionicons name="document-text-outline" size={19} color={COLORS.primary} />
          <Text style={styles.descriptionTitle}>Descrição</Text>
        </View>
        <Text style={styles.descriptionText}>
          {sensor.descricao || sensor.description || 'Nenhuma descrição cadastrada.'}
        </Text>
      </View>
    </ScrollView>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const isMobile = width < 700;
  const [sensors, setSensors] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [savingCode, setSavingCode] = useState(null);

  const loadSensors = useCallback(async (isRefresh = false) => {
    try {
      setError('');
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await listarSensores();
      const normalized = result.map(normalizeSensor);
      setSensors(normalized);
      setSelectedCode((current) => {
        if (current && normalized.some((item) => item._codigo === current)) return current;
        return isMobile ? null : normalized[0]?._codigo || null;
      });
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar os sensores.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isMobile]);

  useEffect(() => {
    loadSensors();
  }, [loadSensors]);

  const selectedSensor = useMemo(
    () => sensors.find((sensor) => sensor._codigo === selectedCode) || null,
    [sensors, selectedCode],
  );

  const filteredSensors = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sensors;

    return sensors.filter((sensor) =>
      [sensor._codigo, sensor._nome, sensor._ambiente]
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [sensors, search]);

  const activeCount = sensors.filter((sensor) => sensor._status).length;
  const inactiveCount = sensors.length - activeCount;

  const handleSelect = async (sensor) => {
    setSelectedCode(sensor._codigo);
    try {
      const details = await visualizarSensor(sensor._codigo);
      if (details && typeof details === 'object') {
        setSensors((current) => current.map((item) =>
          item._codigo === sensor._codigo
            ? normalizeSensor({ ...item, ...details })
            : item,
        ));
      }
    } catch {
      // A listagem continua disponível mesmo que a consulta de detalhes falhe.
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!selectedSensor || savingCode) return;
    const previousStatus = selectedSensor._status;

    setSensors((current) => current.map((item) =>
      item._codigo === selectedSensor._codigo
        ? normalizeSensor({ ...item, status: nextStatus })
        : item,
    ));
    setSavingCode(selectedSensor._codigo);

    try {
      await atualizarStatus(selectedSensor._codigo, nextStatus);
    } catch (requestError) {
      setSensors((current) => current.map((item) =>
        item._codigo === selectedSensor._codigo
          ? normalizeSensor({ ...item, status: previousStatus })
          : item,
      ));
      Alert.alert('Não foi possível atualizar', requestError.message || 'Tente novamente.');
    } finally {
      setSavingCode(null);
    }
  };

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.titleLine}>
        <View style={styles.headerIcon}>
          <Ionicons name="pulse-outline" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.screenTitle}>Sensores</Text>
          <Text style={styles.screenSubtitle}>{sensors.length} cadastrados</Text>
        </View>
        <Pressable
          onPress={() => loadSensors(true)}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.pressedButton]}
          accessibilityLabel="Atualizar lista"
        >
          <Ionicons name="refresh-outline" size={21} color={COLORS.primary} />
        </Pressable>
      </View>
      <View style={styles.statsRow}>
        <View style={[styles.statPill, styles.activeStatPill]}>
          <View style={[styles.statDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>ativos</Text>
        </View>
        <View style={[styles.statPill, styles.inactiveStatPill]}>
          <View style={[styles.statDot, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.statNumber}>{inactiveCount}</Text>
          <Text style={styles.statLabel}>inativos</Text>
        </View>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={19} color={COLORS.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por código, tipo ou ambiente"
          placeholderTextColor="#9AA6B6"
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={10}>
            <Ionicons name="close-circle" size={19} color={COLORS.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.stateText}>Carregando sensores...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={46} color={COLORS.danger} />
            <Text style={styles.errorTitle}>Falha na conexão</Text>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable onPress={() => loadSensors()} style={styles.retryButton}>
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : isMobile && selectedSensor ? (
          <View style={styles.mobileDetailsPage}>
            <Pressable
              onPress={() => setSelectedCode(null)}
              style={({ pressed }) => [styles.mobileBackButton, pressed && styles.pressedButton]}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
              <Text style={styles.mobileBackText}>Voltar para sensores</Text>
            </Pressable>
            <View style={styles.mobileDetailPanel}>
              <DetailPanel
                sensor={selectedSensor}
                saving={savingCode === selectedCode}
                onStatusChange={handleStatusChange}
              />
            </View>
          </View>
        ) : (
          <View style={styles.contentRow}>
            <View style={[styles.listPanel, width < 520 && styles.narrowListPanel]}>
              {listHeader}
              <FlatList
                data={filteredSensors}
                keyExtractor={(item, index) => `${item._codigo}-${index}`}
                renderItem={({ item }) => (
                  <SensorRow
                    sensor={item}
                    selected={item._codigo === selectedCode}
                    onPress={() => handleSelect(item)}
                  />
                )}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                refreshControl={(
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => loadSensors(true)}
                    tintColor={COLORS.primary}
                  />
                )}
                ListEmptyComponent={(
                  <View style={styles.emptyList}>
                    <Ionicons name="search-outline" size={35} color={COLORS.muted} />
                    <Text style={styles.stateText}>
                      {search ? 'Nenhum sensor corresponde à busca.' : 'Nenhum sensor encontrado.'}
                    </Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.detailPanel}>
              <DetailPanel
                sensor={selectedSensor}
                saving={savingCode === selectedCode}
                onStatusChange={handleStatusChange}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 12 },
  contentRow: { flex: 1, flexDirection: 'row', gap: 10 },
  mobileDetailsPage: { flex: 1 },
  mobileBackButton: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  mobileBackText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  mobileDetailPanel: { flex: 1 },
  listPanel: { flex: 0.9, minWidth: 0 },
  narrowListPanel: { flex: 1.05 },
  detailPanel: { flex: 1.25, minWidth: 0 },
  listHeader: {
    minHeight: 145,
    paddingHorizontal: 5,
    paddingBottom: 9,
  },
  titleLine: { minHeight: 58, flexDirection: 'row', alignItems: 'center' },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  headerCopy: { flex: 1, marginLeft: 10 },
  screenTitle: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  screenSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsRow: { flexDirection: 'row', gap: 7, marginTop: 5, marginBottom: 8 },
  statPill: {
    flex: 1,
    height: 32,
    paddingHorizontal: 9,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeStatPill: { backgroundColor: COLORS.successSoft },
  inactiveStatPill: { backgroundColor: COLORS.dangerSoft },
  statDot: { width: 7, height: 7, borderRadius: 4 },
  statNumber: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  statLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  searchBox: {
    height: 45,
    paddingHorizontal: 12,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    marginLeft: 8,
    paddingVertical: 0,
  },
  listContent: { paddingBottom: 18, gap: 7 },
  sensorRow: {
    minHeight: 66,
    padding: 9,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#15284A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  selectedRow: { borderColor: '#9DBCF8', backgroundColor: '#F8FBFF' },
  pressedRow: { opacity: 0.78 },
  sensorIcon: {
    width: 33,
    height: 33,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  selectedSensorIcon: { backgroundColor: COLORS.primarySoft },
  rowContent: { flex: 1, minWidth: 0, marginHorizontal: 9 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sensorCode: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '800' },
  sensorType: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  environmentLine: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 3 },
  environmentText: { flex: 1, color: COLORS.muted, fontSize: 10 },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  activeBadge: { backgroundColor: COLORS.successSoft },
  inactiveBadge: { backgroundColor: COLORS.dangerSoft },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: '700' },
  detailsCard: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#15284A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  detailsScroll: { flex: 1 },
  detailsContent: { padding: 15, paddingBottom: 24 },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 17 },
  largeSensorIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  detailsHeaderText: { flex: 1, marginLeft: 11 },
  detailsEyebrow: { color: COLORS.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  detailsTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  detailStatusCard: {
    minHeight: 70,
    padding: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailStatusValue: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginTop: 3 },
  detailLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  detailGrid: { flexDirection: 'row', gap: 9, marginTop: 10 },
  detailItem: {
    flex: 1,
    minHeight: 108,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 5,
  },
  detailValue: { color: COLORS.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  descriptionBox: {
    marginTop: 10,
    padding: 13,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
  },
  descriptionTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  descriptionTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  descriptionText: { color: '#4B5B73', fontSize: 12, lineHeight: 18, marginTop: 8 },
  emptyDetails: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyDetailsTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptyDetailsText: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateText: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginTop: 10 },
  errorTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginTop: 12 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 11,
    marginTop: 17,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  emptyList: { alignItems: 'center', padding: 30 },
  pressedButton: { opacity: 0.7 },
});
