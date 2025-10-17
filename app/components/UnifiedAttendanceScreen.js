import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, TextInput, Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
// NOTE: adjust import paths according to your folder layout
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { API_URL } from '../../config';

/* -------------------------------------------------------------------------- */
/*                       Unified Attendance Screen Component                  */
/* -------------------------------------------------------------------------- */
export default function UnifiedAttendanceScreen() {
  /* ----------------------------- State & refs ----------------------------- */
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [type, setType] = useState('all'); // all | student | staff
  const [branches, setBranches] = useState([{ label: 'All', value: 'All' }]);
  const [branch, setBranch] = useState('All');
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, unmarked: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  /* ----------------------------- Fetch Branches --------------------------- */
  const fetchBranches = useCallback(async () => {
    try {
      const res = await authFetch('/api/branches/get_branches.php');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const mapped = json.data.map(b => ({ label: b.name ?? b.branch_name, value: b.id ?? b.branch_id }));
        setBranches(prev => [...prev, ...mapped]);
      }
    } catch (err) {
      console.log('Branch fetch error:', err);
    }
  }, []);

  /* -------------------------- Fetch Attendance ---------------------------- */
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const d = date.toISOString().split('T')[0];
      let url = `/api/attendance/get_unified_attendance.php?date=${d}`;
      if (type !== 'all') url += `&type=${type}`;
      if (branch !== 'All') url += `&branch_id=${branch}`;
      const res = await authFetch(url);
      const json = await res.json();
      if (json.success) {
        const { records: rec = [], summary: sum = {} } = json.data;
        setRecords(rec);
        setFiltered(rec);
        setSummary({
          total: sum.total || rec.length,
          present: sum.present || 0,
          absent: sum.absent || 0,
          unmarked: sum.unmarked || 0,
        });
      } else {
        setRecords([]);
        setFiltered([]);
        setSummary({ total: 0, present: 0, absent: 0, unmarked: 0 });
      }
    } catch (err) {
      console.log('Attendance fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [date, type, branch]);

  /* ------------------------------ Effects --------------------------------- */
  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  useEffect(() => {
    if (!search.trim()) return setFiltered(records);
    const q = search.toLowerCase();
    setFiltered(records.filter(r => `${r.name}`.toLowerCase().includes(q) || `${r.id}`.includes(q) || `${r.code}`.includes(q)));
  }, [search, records]);

  /* ----------------------------- UI Renderers ----------------------------- */
  const renderHeader = () => (
    <View>
      {/* Report title */}
      <Text style={styles.title}>Attendance Report</Text>

      {/* Date + Type row */}
      <View style={styles.rowBetween}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <MaterialCommunityIcons name="calendar" size={18} color="#fff" />
          <Text style={styles.dateTxt}>{date.toISOString().split('T')[0]}</Text>
        </TouchableOpacity>
        <View style={styles.typeBar}>
          {['all', 'student', 'staff'].map(t => (
            <TouchableOpacity key={t} style={[styles.typeChip, type === t && styles.typeChipActive]} onPress={() => setType(t)}>
              <Text style={[styles.typeChipTxt, type === t && styles.typeChipTxtActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Branch picker */}
      {branches.length > 1 && (
        <View style={styles.pickerWrap}>
          <Picker selectedValue={branch} onValueChange={v => setBranch(v)}>
            {branches.map(b => (<Picker.Item key={b.value} label={b.label} value={b.value} />))}
          </Picker>
        </View>
      )}

      {/* Search */}
      <TextInput value={search} onChangeText={setSearch} placeholder="Search name / id" style={styles.search} />

      {/* Summary */}
      <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.summaryCard}>
        {['total', 'present', 'absent', 'unmarked'].map(k => (
          <View key={k} style={styles.sumItem}><Text style={styles.sumLabel}>{k}</Text><Text style={styles.sumVal}>{summary[k]}</Text></View>
        ))}
      </LinearGradient>
    </View>
  );

  const renderItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" delay={index * 40} style={styles.card}>
      <Image
        source={item.avatar ? { uri: item.avatar.startsWith('http') ? item.avatar : `${API_URL}${item.avatar}` } : require('../../assets/Avartar.png')}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        {item.type === 'student' && (
          <Text style={styles.cardId}>{item.code || item.id}</Text>
        )}
        {item.type && (
          <Text style={styles.tag}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
        )}
         {item.type === 'staff' && item.note && (
           <Text style={styles.noteTxt} numberOfLines={2}>Note: {item.note}</Text>
         )}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.status, styles[`status_${item.status}`]]}>{item.status}</Text>
        {item.in_time && <Text style={styles.timeTxt}>In: {item.in_time.slice(0, 5)}</Text>}
        {item.out_time && <Text style={styles.timeTxt}>Out: {item.out_time.slice(0, 5)}</Text>}
        {item.type === 'student' && item.in_guardian_type && (
          <Text style={styles.guardianTxt}>
            In by: {item.in_guardian_type}
            {item.in_by ? ` (${item.in_by})` : ''}
          </Text>
        )}
        {item.type === 'student' && item.out_guardian_type && (
          <Text style={styles.guardianTxt}>
            Out by: {item.out_guardian_type}
            {item.out_by ? ` (${item.out_by})` : ''}
          </Text>
        )}
      </View>
    </Animatable.View>
  );

  /* -------------------------------- Return -------------------------------- */
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(it, idx) => `${it.id}-${idx}`}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>No records</Text>}
        />
      )}
      {showDatePicker && (
        <DateTimePicker value={date} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if (d) setDate(d); }} />
      )}
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', paddingHorizontal: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 4 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  dateTxt: { color: '#fff', marginLeft: 6, fontWeight: '600' },
  typeBar: { flexDirection: 'row' },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e0e0e0', marginHorizontal: 2 },
  typeChipActive: { backgroundColor: Colors.primary },
  typeChipTxt: { color: '#555' },
  typeChipTxtActive: { color: '#fff' },
  pickerWrap: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: 10 },
  search: { marginTop: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, height: 40 },
  summaryCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 12, marginTop: 12 },
  sumItem: { alignItems: 'center', flex: 1 },
  sumLabel: { color: '#fff', fontSize: 12, textTransform: 'capitalize' },
  sumVal: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginTop: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
   avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#e0e0e0' },
   cardName: { fontWeight: '700', color: '#333' },
  cardId: { color: '#777', fontSize: 12 },
  status: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, color: '#fff', fontSize: 12, textTransform: 'capitalize', overflow: 'hidden', marginBottom: 2 },
  status_present: { backgroundColor: '#4caf50' },
  status_absent: { backgroundColor: '#e53935' },
  status_unmarked: { backgroundColor: '#757575' },
  timeTxt: { fontSize: 10, color: '#555' },
  guardianTxt: { fontSize: 9, color: '#777', marginTop: 2 },
   noteTxt: { fontSize: 10, color: '#444', marginTop: 2, fontStyle: 'italic', maxWidth: 180 },
});