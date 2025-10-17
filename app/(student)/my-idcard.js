import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, FlatList, Modal, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import StudentService from '../services/StudentService';

const SCHOOL_LOGO = 'https://www.tnhappykids.in/public/images/hk.png';
const DEFAULT_AVATAR = require('../../assets/Avartar.png');

const generateQRValue = (student) => `https://www.tnhappykids.in/verify/${student.studentId}`;

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const CARD_RATIO = 0.6; // height/width for vertical card
const CARD_HEIGHT = CARD_WIDTH / CARD_RATIO;

const StudentIDCardScreen = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isFront, setIsFront] = useState(true);

  const toggleCard = () => setIsFront(!isFront);

  useEffect(() => {
    StudentService.getStudents()
      .then(setStudents)
      .catch(e => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const Front = (stu) => (
    <View style={[styles.card, styles.cardFront]}> 
      <View style={styles.header}> 
        <View style={styles.logoContainer}>
          <Image source={{ uri: SCHOOL_LOGO }} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.schoolInfo}>
          <Text style={styles.schoolName}>TN HAPPY KIDS</Text>
          <Text style={styles.branchName}>{stu.branch ?? ''}</Text>
        </View>
      </View>
      <View style={styles.photoContainer}>
        <Image source={stu.profile_image ? { uri: stu.profile_image } : DEFAULT_AVATAR} style={styles.photo} resizeMode="cover" />
      </View>
      <View style={styles.details}>
        <Text style={[styles.studentName,{fontSize:22}]}>{stu.fullName}</Text>
        <View style={styles.idSection}>
          <Text style={styles.idLabel}>ID:</Text>
          <Text style={styles.idValue}>{stu.studentId}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Father: </Text>
          <Text style={styles.detailValue}>{stu.parentName ?? '-'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Address: </Text>
          <Text style={[styles.detailValue, { flex: 1 }]} numberOfLines={2}>{stu.homeLocation ?? ''}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone: </Text>
          <Text style={styles.detailValue}>{stu.phone ?? '-'}</Text>
        </View>
        {!!stu.bloodGroup && <Text style={styles.bloodGroup}>{stu.bloodGroup}</Text>}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>TN HAPPY KIDS - Where Learning Begins</Text>
      </View>
    </View>
  );

  const Back = (stu) => (
    <View style={[styles.card, styles.cardBack]}>
      <View style={styles.qrContainer}>
        <View style={styles.qrCode}>
          <QRCode value={generateQRValue(stu)} size={120} color="#000" backgroundColor="#ffffff" />
        </View>
        <Text style={styles.qrText}>Scan to verify student ID</Text>
        <Text style={styles.idInfo}>ID: {stu.studentId}</Text>
        <View style={styles.barcodeContainer}>
          <Text style={styles.barcode}>| | |  {stu.studentId}  | | |</Text>
        </View>
      </View>
      <View style={styles.backDetails}>
        <Image source={{ uri: SCHOOL_LOGO }} style={styles.backLogo} resizeMode="contain" />
        <Text style={styles.schoolNameBack}>TN HAPPY KIDS</Text>
        <Text style={styles.contactInfo}>{stu.branchPhone ? `Branch: ${stu.branchPhone}` : ''}</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => { setSelected(item); setIsFront(true); }} style={styles.listItem}>
      <Text style={styles.listItemName}>{item.fullName}</Text>
      <Text style={styles.listItemBranch}>{item.branch}</Text>
      <Text style={styles.listItemId}>{item.studentId}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{color:'red'}}>{error}</Text>
      </SafeAreaView>
    );
  }

  const primary = students && students.length > 0 ? students[0] : null;

  return (
    <SafeAreaView style={styles.container}>
      {primary ? (
        <>
          <TouchableOpacity style={styles.cardContainer} onPress={toggleCard} activeOpacity={0.9}>
            {isFront ? Front(primary) : Back(primary)}
          </TouchableOpacity>
          <View style={styles.instructions}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.instructionsText}>Tap the card to flip</Text>
            </View>
        </>
      ) : (
        <Text style={{color:'#333'}}>No student found.</Text>
      )}
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', padding: 16 ,marginTop:80,},
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  listItem: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  listItemName: { fontWeight: '600', color: '#111' },
  listItemBranch: { color: '#555' },
  listItemId: { color: '#f59e0b', fontWeight: '700' },
  cardContainer: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8, alignSelf: 'center' },
  card: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  cardFront: { backgroundColor: '#fff' },
  cardBack: { backgroundColor: '#fbbf24' },
  header: { backgroundColor: '#EF4444', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoContainer: { marginRight: 10 },
  logo: { width: 60, height: 60 },
  schoolInfo: { alignItems: 'center' },
  schoolName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  branchName: { color: '#fff', fontSize: 14, marginTop: 4 },
  photoContainer: { width: 120, height: 140, backgroundColor: '#f0f0f0', alignSelf: 'center', marginTop: 20, borderRadius: 8, borderWidth: 3, borderColor: '#fff', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  photo: { width: '100%', height: '100%' },
  details: { padding: 16, paddingTop: 24, alignItems: 'flex-start', flex: 1, width: '100%' },
  idSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#f0f0f0', padding: 6, borderRadius: 4, alignSelf: 'center' },
  idLabel: { fontWeight: 'bold', marginRight: 4, color: '#333' },
  idValue: { fontWeight: 'bold', color: '#fbbf24' },
  detailRow: { flexDirection: 'row', marginBottom: 6, width: '100%' },
  detailLabel: { fontWeight: '600', color: '#555', minWidth: 70 },
  detailValue: { color: '#333', flexShrink: 1 },
  studentName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' },
  bloodGroup: { position: 'absolute', top: 24, right: 16, backgroundColor: '#ff3b30', color: '#fff', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#EF4444', padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ddd' },
  footerText: { fontSize: 12, color: '#fff', fontStyle: 'italic', fontWeight: '500' },
  qrContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  qrCode: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  qrText: { color: '#fff', marginTop: 12, fontSize: 14 },
  backDetails: { padding: 16, alignItems: 'center' },
  backLogo: { width: 80, height: 80, marginBottom: 10, backgroundColor: '#fff', borderRadius: 40 },
  schoolNameBack: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  contactInfo: { color: '#fff', fontSize: 14, marginBottom: 4 },
  idInfo: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  barcodeContainer: { position: 'absolute', bottom: 50, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 10, alignItems: 'center' },
  barcode: { fontSize: 16, letterSpacing: 1, color: '#000', fontWeight: 'bold', flexWrap: 'nowrap' },
  instructions: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  instructionsText: { marginLeft: 8, color: '#666', fontSize: 14 },
});

export default StudentIDCardScreen;