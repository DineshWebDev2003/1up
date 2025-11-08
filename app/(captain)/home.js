import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, FlatList, useWindowDimensions, Modal, ActivityIndicator, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';
import { useCaptain } from '../(common)/CaptainProvider';

const CaptainDashboard = () => {
  const { captain, students, setStudents, loading } = useCaptain();
  const insets = useSafeAreaInsets();
  const [mapRegion, setMapRegion] = useState({
    latitude: 11.023654,
    longitude: 76.944028,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  });
  const [clockedIn, setClockedIn] = useState(false);
  const [isMapFullScreen, setMapFullScreen] = useState(false);
  const [mapLayout, setMapLayout] = useState(null);
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'map', title: 'Map View' },
    { key: 'list', title: 'Student List' },
  ]);

  const handleClockIn = async () => {
    try {
      await authFetch('/api/captain_attendance.php', { method: 'POST', body: JSON.stringify({ action: 'clock_in' }) });
      setClockedIn(true);
      Alert.alert('Success', 'You have clocked in.');
    } catch (error) {
      Alert.alert('Error', 'Failed to clock in.');
    }
  };

  const handleClockOut = async () => {
    try {
      await authFetch('/api/captain_attendance.php', { method: 'POST', body: JSON.stringify({ action: 'clock_out' }) });
      setClockedIn(false);
      Alert.alert('Success', 'You have clocked out.');
    } catch (error) {
      Alert.alert('Error', 'Failed to clock out.');
    }
  };

  const handlePickup = async (studentId) => {
    try {
      await authFetch('/api/pick_up_student.php', { method: 'POST', body: JSON.stringify({ student_id: studentId }) });
      setStudents(students ? students.map(s => s.id === studentId ? { ...s, pickedUp: true } : s) : []);
      Alert.alert('Success', 'Student picked up.');
    } catch (error) {
      Alert.alert('Error', 'Failed to pick up student.');
    }
  };

  const renderMap = () => (
    <View style={styles.mapContainer} onLayout={(event) => setMapLayout(event.nativeEvent.layout)}>
      {mapLayout ? (
        <>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={{ width: mapLayout.width, height: mapLayout.height }}
            initialRegion={mapRegion}
          >
            <UrlTile
              urlTemplate="https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              maximumZ={19}
            />
            {(students && Array.isArray(students)) ? students.map(student => (
              <Marker
                key={student.id}
                coordinate={{ latitude: student.latitude, longitude: student.longitude }}
                title={student.name}
              >
                <Image source={{ uri: student.photo }} style={styles.markerPhoto} />
              </Marker>
            )) : null}
          </MapView>
          <TouchableOpacity
            style={styles.fullScreenButton}
            onPress={() => setMapFullScreen(true)}
          >
            <FontAwesome5 name="expand" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </>
      ) : (
        <ActivityIndicator size="large" color={Colors.primary} style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}/>
      )}
    </View>
  );

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'map':
        return renderMap();
      case 'list':
        return (
          <FlatList
            data={(students || []).filter(s => !!s.onDuty)}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.studentCard}>
                <Image source={{ uri: item.photo }} style={styles.studentPhoto} />
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentClass}>{item.class}</Text>
                </View>
                <View style={styles.studentActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <FontAwesome5 name="phone" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, item.pickedUp && styles.pickedUpButton]}
                    onPress={() => !item.pickedUp && handlePickup(item.id)}
                    disabled={item.pickedUp}>
                    <FontAwesome5 name="child" size={20} color={item.pickedUp ? Colors.white : Colors.success} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.listContainer}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={Colors.gradientMain} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={{ color: Colors.white, marginTop: 10, fontSize: 16 }}>Loading Captain Data...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Colors.gradientMain} style={styles.container}>
      <Animatable.View animation="fadeIn" duration={800} style={styles.animatedContainer}>
        <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <Modal
          visible={isMapFullScreen}
          animationType="slide"
          onRequestClose={() => setMapFullScreen(false)}
        >
          <View style={{flex: 1}}>
            <MapView
              provider={PROVIDER_DEFAULT}
              style={StyleSheet.absoluteFillObject}
              initialRegion={mapRegion}
            >
              <UrlTile
                urlTemplate="https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                maximumZ={19}
              />
              {(students && Array.isArray(students)) ? students.map(student => (
                <Marker
                  key={student.id}
                  coordinate={{ latitude: student.latitude, longitude: student.longitude }}
                  title={student.name}
                >
                  <Image source={{ uri: student.photo }} style={styles.markerPhoto} />
                </Marker>
              )) : null}
            </MapView>
            <TouchableOpacity
              style={styles.fullScreenButton}
              onPress={() => setMapFullScreen(false)}
            >
              <FontAwesome5 name="compress" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </Modal>
        {/* Header Section */}
        <Animatable.View animation="fadeInDown" duration={600} style={styles.headerContainer}>
          <View style={styles.profileContainer}>
            {captain && (
              <>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.avatarBackground}
                  >
                    <Image source={{ uri: captain.photo }} style={styles.profilePhoto} />
                  </LinearGradient>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.profileName}>{captain.name}</Text>
                  <Text style={styles.profileRole}>Captain</Text>
                  <Text style={styles.profileBranch}>{captain.branch}</Text>
                </View>
              </>
            )}
            <View style={styles.dutyStatusContainer}>
              {!clockedIn ? (
                <TouchableOpacity style={[styles.dutyButton, styles.onDutyButton]} onPress={handleClockIn}>
                  <FontAwesome5 name="user-check" size={16} color={Colors.white} />
                  <Text style={styles.dutyButtonText}>On Duty</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.dutyButton, styles.offDutyButton]} onPress={handleClockOut}>
                  <FontAwesome5 name="user-times" size={16} color={Colors.white} />
                  <Text style={styles.dutyButtonText}>Off Duty</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animatable.View>

        {/* Stats Cards */}
        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <LinearGradient
              colors={['#FF9A8B', '#FF6A88', '#FF99AC']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.countBox}
            >
              <View style={styles.countContent}>
                <FontAwesome5 name="users" size={32} color="#FFF" />
                <View style={styles.countTextContainer}>
                  <Text style={styles.countNumber}>{students ? students.length : 0}</Text>
                  <Text style={styles.countLabel}>Total Students</Text>
                </View>
              </View>
            </LinearGradient>
            <LinearGradient
              colors={['#30cfd0', '#330867']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.countBox}
            >
              <View style={styles.countContent}>
                <FontAwesome5 name="user-check" size={32} color="#FFF" />
                <View style={styles.countTextContainer}>
                  <Text style={styles.countNumber}>{students ? students.filter(s => s.pickedUp).length : 0}</Text>
                  <Text style={styles.countLabel}>Picked Up</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animatable.View>
        {students && students.length > 0 ? (
          <TabView
            lazy
            renderLazyPlaceholder={() => (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            )}
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: layout.width }}
            renderTabBar={props => <TabBar {...props} style={styles.tabBar} indicatorStyle={styles.indicator} activeColor={Colors.primary} inactiveColor={Colors.text} labelStyle={styles.label} />}
          />
        ) : (
          <Animatable.View 
            animation="fadeInUp" 
            duration={600} 
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={styles.noStudentsText}>No students assigned to this branch.</Text>
          </Animatable.View>
        )}
        </SafeAreaView>
      </Animatable.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  animatedContainer: { flex: 1 },
  safeArea: { flex: 1 },
  
  // Header Section
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatarBackground: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profilePhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  profileRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
    fontWeight: '500',
  },
  profileBranch: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  dutyStatusContainer: {
    alignItems: 'flex-end',
  },
  dutyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  onDutyButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  offDutyButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  dutyButtonText: {
    color: Colors.white,
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  
  // Stats Section
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  countBox: {
    flex: 1,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  countContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  countTextContainer: {
    alignItems: 'flex-end',
  },
  countLabel: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
    opacity: 0.9,
    letterSpacing: 0.3,
  },
  countNumber: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  
  // Map and Content
  mapContainer: { flex: 1 },
  fullScreenButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  studentPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  studentInfo: {
    flex: 1,
    marginLeft: 15,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  studentClass: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
  },
  studentActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 10,
    marginLeft: 10,
    borderRadius: 8,
  },
  pickedUpButton: {
    backgroundColor: Colors.success,
    borderRadius: 25,
  },
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  indicator: {
    backgroundColor: Colors.primary,
  },
  label: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  noStudentsText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
    letterSpacing: 0.3,
  },
});

export default CaptainDashboard;

