import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, FlatList, useWindowDimensions, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { FontAwesome5 } from '@expo/vector-icons';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';
import { useCaptain } from '../(common)/CaptainProvider';

const StudentNavigator = () => {
  const { captain, students, setStudents, loading } = useCaptain();
  const [mapRegion, setMapRegion] = useState({
    latitude: 11.023654,
    longitude: 76.944028,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  });
  const [isMapFullScreen, setMapFullScreen] = useState(false);
  const [mapLayout, setMapLayout] = useState(null);
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'map', title: 'Map View' },
    { key: 'list', title: 'Student List' },
  ]);

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
        <ActivityIndicator size="large" color={Colors.white} style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}/>
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
            data={students || []}
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
          <Text style={{ color: Colors.white, marginTop: 10, fontSize: 16 }}>Loading Student Data...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Colors.gradientMain} style={styles.container}>
      <Animatable.View animation="fadeIn" duration={800} style={styles.animatedContainer}>
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
        
        <Animatable.View animation="fadeInDown" duration={600} style={styles.header}>
          <Text style={styles.headerTitle}>Student Navigator</Text>
          <Text style={styles.headerSubtitle}>Track and manage student locations</Text>
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
      </Animatable.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  animatedContainer: { flex: 1 },
  header: { 
    padding: 20, 
    paddingTop: 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 20,
  },
  mapContainer: { flex: 1 },
  fullScreenButton: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.8)', padding: 10, borderRadius: 5 },
  markerPhoto: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: Colors.white },
  listContainer: { padding: 15 },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  studentPhoto: { width: 50, height: 50, borderRadius: 25 },
  studentInfo: { flex: 1, marginLeft: 15 },
  studentName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  studentClass: { fontSize: 14, color: Colors.text },
  studentActions: { flexDirection: 'row' },
  actionButton: { padding: 10, marginLeft: 10 },
  pickedUpButton: { backgroundColor: Colors.success, borderRadius: 25 },
  tabBar: { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: '#eee' },
  indicator: { backgroundColor: Colors.primary },
  label: { color: Colors.text, fontWeight: 'bold' },
  noStudentsText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default StudentNavigator;
