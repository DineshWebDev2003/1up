import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Animatable from 'react-native-animatable';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import { API_URL } from '../../config';

const TrackCabScreen = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState({ latitude: 13.0827, longitude: 80.2707 }); // Default to Chennai
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [studentLocation, setStudentLocation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const schoolLocation = { latitude: 13.09, longitude: 80.27 }; // School location
  const mapRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('userData').then((v) => {
      if (v) setCurrentUser(JSON.parse(v));
    });
    const toggleLocationTracking = async () => {
      if (isOnDuty) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Permission to access location was denied.');
          setIsOnDuty(false);
          return;
        }

        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // 5 seconds
            distanceInterval: 10, // 10 meters
          },
          (location) => {
            setDriverLocation(location.coords);
            // Here you would also send the location to your server
          }
        );
        setLocationSubscription(subscription);
      } else {
        if (locationSubscription) {
          locationSubscription.remove();
          setLocationSubscription(null);
        }
      }
    };

    toggleLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isOnDuty]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await authFetch('/api/cabs/get_cab_students_status.php');
        const result = await response.json();
        if (result.success) {
          setStudents(result.data);
          if (result.data && result.data.length > 0) {
            // For simplicity, let's track the first student in the list
            const firstStudent = result.data[0];
            if (firstStudent.latitude && firstStudent.longitude) {
              setStudentLocation({ latitude: parseFloat(firstStudent.latitude), longitude: parseFloat(firstStudent.longitude) });
            }
          }
        } else {
            Alert.alert("Info", result.message || "Could not fetch student status.");
        }
      } catch (error) {
        console.error('Error fetching cab status:', error);
        Alert.alert("Error", "An error occurred while fetching student status.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const renderStudentItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" delay={index * 100} style={styles.studentCard}>
      <Image source={item.avatar ? { uri: `${API_URL}${item.avatar}` } : require('../../assets/Avartar.png')} style={styles.avatar} />
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.student_name}</Text>
        <View style={[styles.statusBadge, item.pickup_status === 'picked' ? styles.pickedBadge : styles.notPickedBadge]}>
          <Text style={styles.statusText}>
            {item.pickup_status === 'picked' ? `Picked at ${new Date(item.pickup_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Not Yet Picked'}
          </Text>
        </View>
      </View>
      <FontAwesome5 name={item.pickup_status === 'picked' ? 'check-circle' : 'clock'} size={24} color={item.pickup_status === 'picked' ? Colors.success : Colors.warning} solid />
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={{ ...schoolLocation, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }}>
        <Marker coordinate={schoolLocation} title="Happy Kids Playschool">
          <FontAwesome5 name="school" size={30} color={Colors.accent} />
        </Marker>
        {driverLocation && (
          <Marker coordinate={driverLocation} title="Cab Location">
            <Animatable.View animation="pulse" easing="ease-out" iterationCount="infinite">
              <FontAwesome5 name="bus" size={30} color={Colors.primary} />
            </Animatable.View>
          </Marker>
        )}
        {studentLocation && (
          <Marker coordinate={studentLocation} title="Student's Home">
            <FontAwesome5 name="home" size={30} color={Colors.success} />
          </Marker>
        )}
      </MapView>

      <Animatable.View animation="slideInUp" duration={800} style={styles.bottomSheet}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Driver: Mr. Kumar</Text>
          <Text style={styles.headerSubtitle}>Towards School</Text>
          <View style={styles.dutyStatusContainer}>
            <View style={[styles.statusIndicator, isOnDuty ? styles.onDuty : styles.offDuty]} />
            <Text style={styles.dutyStatusText}>{isOnDuty ? 'On Duty' : 'Off Duty'}</Text>
          </View>
        </View>
        {loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : (
          <>
          <FlatList
            data={students}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item.student_id.toString()}
            contentContainerStyle={styles.listContainer}
          />
          {(currentUser && currentUser.role !== 'Student') && (
            <TouchableOpacity style={[styles.dutyButton, isOnDuty ? styles.offDutyButton : styles.onDutyButton]} onPress={() => setIsOnDuty(!isOnDuty)}>
              <Text style={styles.dutyButtonText}>{isOnDuty ? 'Go Off Duty' : 'Go On Duty'}</Text>
            </TouchableOpacity>
          )}
          </>
        )}
      </Animatable.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  map: { flex: 1 },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  headerContainer: {
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.darkText },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  dutyStatusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  onDuty: { backgroundColor: Colors.success },
  offDuty: { backgroundColor: Colors.danger },
  dutyStatusText: { fontSize: 14, fontWeight: '600' },
  listContainer: { paddingTop: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: 'bold', color: Colors.darkText },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  pickedBadge: { backgroundColor: Colors.successLight },
  notPickedBadge: { backgroundColor: Colors.warningLight },
  statusText: { fontSize: 12, fontWeight: '600' },
  dutyButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  onDutyButton: { backgroundColor: Colors.primary },
  offDutyButton: { backgroundColor: Colors.danger },
  dutyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default TrackCabScreen;
