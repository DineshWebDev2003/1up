import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, Modal, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import FlipCard from 'react-native-flip-card';

// Mock Data
const initialStudents = [
  { id: '1', name: 'John Doe', studentId: 'S001', branch: 'Main Campus', class: 'Daycare', mobile: '123-456-7890' },
  { id: '2', name: 'Jane Smith', studentId: 'S002', branch: 'North Campus', class: 'Toddler', mobile: '234-567-8901' },
  { id: '3', name: 'Peter Jones', studentId: 'S003', branch: 'Main Campus', class: 'Daycare', mobile: '345-678-9012' },
  { id: '4', name: 'Mary Williams', studentId: 'S004', branch: 'East Campus', class: 'Playgroup', mobile: '456-789-0123' },
  { id: '5', name: 'David Brown', studentId: 'S005', branch: 'North Campus', class: 'Toddler', mobile: '567-890-1234' },
];

const branches = ['All', 'Main Campus', 'North Campus', 'East Campus'];
const franchiseMobile = '987-654-3210';

export default function IDCardScreen() {
  const [students, setStudents] = useState(initialStudents);
  const [filteredStudents, setFilteredStudents] = useState(initialStudents);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    let result = students;
    if (selectedBranch !== 'All') {
      result = result.filter(student => student.branch === selectedBranch);
    }
    if (searchQuery) {
      result = result.filter(student => student.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredStudents(result);
  }, [searchQuery, selectedBranch, students]);

  const renderStudentListItem = ({ item }) => (
    <TouchableOpacity style={styles.studentCard} onPress={() => setSelectedStudent(item)}>
      <Image source={require('../../assets/Avartar.png')} style={styles.studentListAvatar} />
      <View>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentDetails}>{item.branch} - {item.studentId}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Student ID Cards</Text>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <TextInput style={styles.searchInput} placeholder="Search by name..." value={searchQuery} onChangeText={setSearchQuery} />
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedBranch} onValueChange={setSelectedBranch} style={styles.picker}>
              {branches.map(branch => <Picker.Item key={branch} label={branch} value={branch} />)}
            </Picker>
          </View>
        </View>

        {/* Student List */}
        <FlatList
          data={filteredStudents}
          renderItem={renderStudentListItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
        />

        {/* ID Card Modal */}
        {selectedStudent && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={!!selectedStudent}
            onRequestClose={() => setSelectedStudent(null)}
          >
            <View style={styles.modalContainer}>
              <FlipCard 
                style={styles.cardContainer}
                flipHorizontal={true}
                flipVertical={false}
              >
                {/* Face Side */}
                <View style={[styles.idCard, styles.cardFront]}>
                  <Image source={require('../../assets/logo.png')} style={styles.logo} />
                  <Image source={require('../../assets/Avartar.png')} style={styles.idCardAvatar} />
                  <View style={styles.textContainer}>
                    <Text style={styles.idCardName}>{selectedStudent.name}</Text>
                    <Text style={styles.idCardText}>ID: {selectedStudent.studentId}</Text>
                    <Text style={styles.idCardText}>Class: {selectedStudent.class}</Text>
                    <Text style={styles.idCardText}>Branch: {selectedStudent.branch}</Text>
                    <Text style={styles.idCardText}>Mobile: {selectedStudent.mobile}</Text>
                  </View>
                </View>
                {/* Back Side */}
                <View style={[styles.idCard, styles.cardBack]}>
                  <Image source={require('../../assets/logo.png')} style={styles.logo} />
                  <View style={styles.qrContainer}>
                    <QRCode value={JSON.stringify(selectedStudent)} size={60} />
                  </View>
                  <View style={styles.backTextContainer}>
                    <Text style={styles.idCardBackText}>Contact: {franchiseMobile}</Text>
                    <Text style={styles.idCardBackText}>Happy Kids Playschool</Text>
                  </View>
                </View>
              </FlipCard>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedStudent(null)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f7fc' },
  container: { flex: 1, padding: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  controlsContainer: { marginBottom: 15 },
  searchInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 10 },
  pickerContainer: { backgroundColor: '#fff', borderRadius: 10 },
  picker: { height: 50 },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  studentListAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  studentName: { fontSize: 18, fontWeight: 'bold' },
  studentDetails: { fontSize: 14, color: '#666' },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  cardContainer: { width: 320, height: 180 },
  idCard: { width: '100%', height: '100%', borderRadius: 12, alignItems: 'center', padding: 10, flexDirection: 'row', justifyContent: 'space-around' },
  cardFront: { backgroundColor: '#4287f5' },
  cardBack: { backgroundColor: '#f56e45' },
  logo: { width: 20, height: 20, position: 'absolute', top: 8, right: 8, opacity: 0.9 },
  idCardAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#fff' },
  textContainer: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  idCardName: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  idCardText: { fontSize: 10, color: '#fff', marginBottom: 2 },
  qrContainer: { backgroundColor: '#fff', padding: 5, borderRadius: 5 },
  backTextContainer: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  idCardBackText: { fontSize: 10, color: '#fff', textAlign: 'center', marginBottom: 3 },
  closeButton: { marginTop: 20, backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  closeButtonText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
});

