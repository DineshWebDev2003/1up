import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Dimensions, Image, LayoutAnimation, UIManager, Platform, Modal, TextInput, Linking } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Location from 'expo-location';
// Default fallback location (will be overridden by branch location when available)
const schoolLocation = {
  latitude: 12.9716,
  longitude: 77.5946
};
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    0.5 - Math.cos(dLat) / 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    (1 - Math.cos(dLon)) / 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

const mapStyle = [ { "featureType": "road", "elementType": "geometry", "stylers": [ { "color": "#e9e9e9" } ] }, { "featureType": "road", "elementType": "labels.text.fill", "stylers": [ { "color": "#8a8a8a" } ] }, { "featureType": "road.arterial", "elementType": "geometry", "stylers": [ { "color": "#ffffff" } ] }, { "featureType": "road.highway", "elementType": "geometry", "stylers": [ { "color": "#f5f5f5" } ] }, { "featureType": "road.local", "elementType": "geometry", "stylers": [ { "color": "#f0f0f0" } ] }, { "featureType": "water", "elementType": "geometry", "stylers": [ { "color": "#d4e4f3" } ] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [ { "color": "#9e9e9e" } ] } ];

const LiveCabScreen = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [branches, setBranches] = useState([]);
  const [isBranchModalVisible, setBranchModalVisible] = useState(false);
  const [notifiedArrival, setNotifiedArrival] = useState([]);
  const [isFullMapView, setIsFullMapView] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [isStudentModalVisible, setIsStudentModalVisible] = useState(false);
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const insets = useSafeAreaInsets();

  const parseBranchLocation = (locStr) => {
    if (!locStr || !locStr.includes(',')) return null;
    const [lat, lng] = locStr.split(',').map(Number);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { latitude: lat, longitude: lng };
  };

  const branchCenter = useMemo(() => {
    // Prefer selected driver's branch; else first branch; else fallback
    const branch = selectedDriver ? branches.find(b => b.id === selectedDriver.branch_id) : (branches && branches.length > 0 ? branches[0] : null);
    const coords = branch ? parseBranchLocation(branch.location) : null;
    return coords || schoolLocation;
  }, [branches, selectedDriver]);

      useEffect(() => {
    const loadData = async () => {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (sessionToken) {
        fetchDrivers();
        fetchBranches();
      }
    };
    loadData();
  }, []);

  
  useEffect(() => {
    const startLocationTracking = async () => {
        if (!selectedDriver) {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
            }
            return;
        }

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission to access location was denied');
            return;
        }

        if (locationSubscription.current) {
            locationSubscription.current.remove();
        }

        locationSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 10000, // 10 seconds
                distanceInterval: 10, // 10 meters
            },
            (location) => {
                const { latitude, longitude } = location.coords;
                
                setDrivers(prevDrivers => {
                    const newDrivers = prevDrivers.map(d =>
                        d.id === selectedDriver.id ? { ...d, location: { latitude, longitude } } : d
                    );
                    return newDrivers;
                });

                updateDriverLocation(selectedDriver.id, latitude, longitude);
            }
        );
    };

    startLocationTracking();

    return () => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
        }
    };
}, [selectedDriver]);

  const handleNavigateToBranch = (driverLocation, branchLocationStr) => {
    if (!branchLocationStr || !branchLocationStr.includes(',')) {
        alert('Branch location is not set correctly.');
        return;
    }
    const [lat, lng] = branchLocationStr.split(',').map(Number);
    const destinationLatLng = `${lat},${lng}`;
    
    const url = Platform.select({
      ios: `maps:?daddr=${destinationLatLng}&dirflg=d`,
      android: `google.navigation:q=${destinationLatLng}`
    });
    
    Linking.openURL(url).catch(err => console.error('An error occurred', err));
  };

  const handleNavigateToStudent = (studentLocation) => {
    const { latitude, longitude } = studentLocation;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const label = 'Student Pickup Location';
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    
    Linking.openURL(url);
  };

const updateDriverLocation = async (driverId, latitude, longitude) => {
    try {
        await authFetch(`${API_URL}/cabs/update_driver_location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                driver_id: driverId,
                latitude,
                longitude,
            }),
        });
    } catch (error) {
        console.error('Failed to update driver location:', error);
    }
};

  const fetchDrivers = async () => {
    try {
      const response = await authFetch(`${API_URL}/cabs/get_drivers`);
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setDrivers(data);
      } else if (response.ok && data && Array.isArray(data.data)) {
        setDrivers(data.data);
      } else {
        console.error('API did not return a valid array for drivers:', data);
        setDrivers([]); // Set to empty array to prevent crash
        // Don't show alert for API errors to prevent crashes
        console.warn(data?.message || 'Failed to fetch drivers.');
      }
    } catch (error) {
      console.error('Fetch drivers error:', error);
      setDrivers([]); // Ensure drivers is always an array
      // Don't show alert for network errors to prevent crashes
      console.warn('Network error while fetching drivers.');
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await authFetch(`${API_URL}/branches/get_branches`);
      const result = await response.json();
      if (response.ok && result.success) {
        setBranches(result.data || []);
      } else {
        setBranches([]); // Set to empty array to prevent crash
        console.warn(result?.message || 'Failed to fetch branches.');
      }
    } catch (error) {
      console.error('Fetch branches error:', error);
      setBranches([]); // Ensure branches is always an array
      console.warn('Network error while fetching branches.');
    }
  };

  // The location simulation effect can be added back if needed, but for now we focus on CRUD
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     // ... simulation logic ...
  //   }, 2000);
  //   return () => clearInterval(interval);
  // }, [drivers]);

  const handleSelectDriver = (driver) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setSelectedDriver(driver);
      
      if (!driver || !driver.location || !mapRef.current) {
        console.warn('Invalid driver data or map reference');
        return;
      }
      
      const studentLocations = (driver.students && Array.isArray(driver.students)) 
        ? driver.students.filter(s => s.parentLocation).map(s => s.parentLocation) 
        : [];
      const coordinates = [driver.location, ...studentLocations, schoolLocation];
      
      if (coordinates.length > 2) {
        mapRef.current.fitToCoordinates(coordinates, { 
          edgePadding: { top: 150, right: 50, bottom: height * 0.45, left: 50 }, 
          animated: true 
        });
      } else {
        mapRef.current.animateToRegion({ 
          ...driver.location, 
          latitudeDelta: 0.05, 
          longitudeDelta: 0.05 
        }, 1000);
      }
    } catch (error) {
      console.error('Error selecting driver:', error);
    }
  };


  const handleDeselectDriver = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedDriver(null);
      setNotifiedArrival([]); // Reset notifications on deselect
      mapRef.current.animateToRegion({
          ...schoolLocation,
          latitudeDelta: 0.4,
          longitudeDelta: 0.4,
      }, 1000);
  }

    const handleDeleteDriver = async (driverId) => {
    try {
      const response = await authFetch(`${API_URL}/cabs/delete_driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: driverId }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setDrivers(prevDrivers => prevDrivers.filter(driver => driver.id !== driverId));
        if (selectedDriver && selectedDriver.id === driverId) {
          handleDeselectDriver();
        }
      } else {
        alert(result.message || 'Failed to delete driver.');
      }
    } catch (error) {
      console.error('Delete driver error:', error);
      alert('An error occurred while deleting the driver.');
    }
  };

    const handleUpdateBranch = async (driverId, branchId) => {
    try {
      const response = await authFetch(`${API_URL}/cabs/update_driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: driverId, branch_id: branchId }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        // Update driver in local state
        const updatedDrivers = (drivers && Array.isArray(drivers)) ? drivers.map(d => 
          d.id === driverId ? { ...d, branch_id: branchId } : d
        ) : [];
        setDrivers(updatedDrivers);
        setSelectedDriver(prev => ({ ...prev, branch_id: branchId }));
        setBranchModalVisible(false);
        alert('Branch updated successfully!');
      } else {
        alert(result.message || 'Failed to update branch.');
      }
    } catch (error) {
      console.error('Update branch error:', error);
      alert('An error occurred while updating the branch.');
    }
  };

  const handlePickUp = async (driverId, studentId, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      const response = await authFetch(`${API_URL}/cabs/update_pickup_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId, student_id: studentId, picked_up: newStatus }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        const updatedDrivers = (drivers && Array.isArray(drivers)) ? drivers.map(d => 
          d.id === driverId ? { ...d, students: (d.students && Array.isArray(d.students)) ? d.students.map(s => s.id === studentId ? { ...s, pickedUp: newStatus } : s) : [] } : d
        ) : [];
        setDrivers(updatedDrivers);
        setSelectedDriver(prev => updatedDrivers.find(d => d.id === prev.id));
      } else {
        alert(result.message || 'Failed to update pickup status.');
      }
    } catch (error) {
      console.error('Pickup error:', error);
      alert('An error occurred while updating pickup status.');
    }
  };

  const renderDriverItem = ({ item, index }) => {
    if (!item || !item.id) return null;
    
    const students = item.students || [];
    const pickedUpCount = students.filter(s => s && s.pickedUp).length;
    
    return (
      <Animatable.View animation="fadeInUp" duration={400} delay={index * 100} style={styles.driverItemContainer}>
        <TouchableOpacity onPress={() => handleSelectDriver(item)} style={styles.driverItem}>
          <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.driverItemGradient}>
              <Image source={item.avatar ? { uri: `${API_URL}${item.avatar}` } : require('../../assets/Avartar.png')} style={styles.avatar} />
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{item.name || 'Unknown Driver'}</Text>
                <Text style={styles.cabNumber}>{item.cabNumber || 'No Cab Number'}</Text>
              </View>
              <View style={styles.driverActions}>
                <View style={styles.studentCountContainer}>
                    <FontAwesome5 name="child" size={16} color={Colors.primary} />
                    <Text style={styles.studentCountText}>
                      {`${pickedUpCount}/${students.length}`}
                    </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleDeleteDriver(item.id)} 
                  style={styles.deleteButton}
                >
                  <MaterialIcons name="delete" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
          </LinearGradient>
      </TouchableOpacity>
      </Animatable.View>
    );
  };

  const renderStudentItem = ({ item, driver }) => {
    if (!item || !driver) return null;
    
    const handleStudentPress = () => {
      setSelectedStudentDetails({
        ...item,
        driverName: driver.name,
        pickupTime: item.pickedUp ? new Date().toLocaleTimeString() : null
      });
      setIsStudentModalVisible(true);
    };
    
    return (
      <Animatable.View animation="fadeIn" duration={300} style={styles.studentItem}>
        <TouchableOpacity onPress={handleStudentPress} style={styles.studentTouchable}>
          <Image source={{ uri: `https://i.pravatar.cc/150?u=${item.id}` }} style={styles.studentAvatar} />
          <View style={styles.studentInfoContainer}>
            <Text style={styles.studentName}>{item.name || 'Unknown Student'}</Text>
            <Text style={styles.studentStatus}>{item.pickedUp ? 'Picked Up' : 'Pending'}</Text>
            {item.pickedUp && (
              <Text style={styles.pickupTime}>Picked at: {new Date().toLocaleTimeString()}</Text>
            )}
          </View>
        </TouchableOpacity>
        {!item.pickedUp && item.parentLocation && (
            <TouchableOpacity onPress={() => handleNavigateToStudent(item.parentLocation)} style={styles.navigateButton}>
                <FontAwesome5 name="directions" size={16} color={Colors.white} />
            </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handlePickUp(driver.id, item.id, item.pickedUp)}>
          <LinearGradient colors={item.pickedUp ? ['#6DD5FA', '#2980B9'] : ['#FFC371', '#FF5F6D']} style={styles.pickupButton}>
            <FontAwesome5 name={item.pickedUp ? "check-circle" : "map-marker-alt"} size={16} color={Colors.white} />
            <Text style={styles.pickupButtonText}>{item.pickedUp ? 'Picked Up' : 'Pick Up'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} customMapStyle={mapStyle} initialRegion={{ ...branchCenter, latitudeDelta: 0.4, longitudeDelta: 0.4 }}>
        <Marker coordinate={branchCenter} zIndex={10}>
            <Animatable.View animation="pulse" easing="ease-out" iterationCount="infinite" style={styles.schoolMarker}>
                <View style={styles.schoolIconContainer}>
                  <FontAwesome5 name="school" size={24} color={Colors.white} />
                </View>
                <Animatable.View 
                  animation="bounceIn" 
                  easing="ease-out" 
                  iterationCount="infinite" 
                  duration={2000}
                  style={styles.schoolPulse}
                />
            </Animatable.View>
        </Marker>
        {(drivers && Array.isArray(drivers)) ? drivers.filter(driver => driver && driver.location).map(driver => (
          <Marker key={driver.id} coordinate={driver.location} title={driver.name || 'Driver'}>
             <Animatable.View animation="bounceIn" duration={1000} style={styles.driverMarkerContainer}>
               <Image source={(driver && driver.avatar) ? { uri: `${API_URL}${driver.avatar}` } : require('../../assets/Avartar.png')} style={styles.driverMarkerImage} />
             </Animatable.View>
          </Marker>
        )) : null}
        {selectedDriver && selectedDriver.students && Array.isArray(selectedDriver.students) ? selectedDriver.students.filter(student => student && student.parentLocation).map(student => (
          <Marker key={student.id} coordinate={student.parentLocation} title={student.name || 'Student'}>
              <Animatable.View animation="zoomIn" style={[styles.studentMarker, {backgroundColor: student.pickedUp ? Colors.accent : Colors.primary}]}>
                <FontAwesome5 name="child" size={18} color={Colors.white} />
              </Animatable.View>
          </Marker>
        )) : null}
        {selectedDriver && selectedDriver.location && (
          <Polyline 
            coordinates={[
              selectedDriver.location, 
              ...(selectedDriver.students && Array.isArray(selectedDriver.students) 
                ? selectedDriver.students.filter(s => s && !s.pickedUp && s.parentLocation).map(s => s.parentLocation) 
                : []), 
              branchCenter
            ]} 
            strokeColor={Colors.primary} 
            strokeWidth={5} 
            lineDashPattern={[10, 10]} 
          />
        )}
      </MapView>



      <Modal
        animationType="slide"
        transparent={true}
        visible={isBranchModalVisible}
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <View style={styles.modalContainer}>
            <View style={styles.modalView}>
                <Text style={styles.modalTitle}>Assign Branch</Text>
                <FlatList
                    data={branches}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.branchSelectItem}
                            onPress={() => handleUpdateBranch(selectedDriver.id, item.id)}
                        >
                            <Text style={styles.branchSelectItemText}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    style={{width: '100%'}}
                />
                 <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, {marginTop: 15}] }
                    onPress={() => setBranchModalVisible(false)}
                >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#8B5CF6', '#06B6D4']} style={styles.header}>
            <LottieView source={require('../../assets/lottie/live-cab.json')} autoPlay loop style={styles.lottie} />
            <Text style={styles.headerTitle}>Live Cab Tracking</Text>
            <TouchableOpacity 
              style={styles.fullMapButton} 
              onPress={() => setIsFullMapView(!isFullMapView)}
            >
              <MaterialIcons 
                name={isFullMapView ? "fullscreen-exit" : "fullscreen"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
        </LinearGradient>
      </View>

      <Animatable.View animation="slideInUp" duration={600} style={[styles.bottomContainer, isFullMapView && styles.minimizedBottomContainer]}>
        <View style={styles.handleBar} />
          selectedDriver ? (
            <View style={{flex: 1}}>
              <View style={styles.driverDetailHeader}>
                  <Image source={(selectedDriver && selectedDriver.avatar) ? { uri: `${API_URL}${selectedDriver.avatar}` } : require('../../assets/Avartar.png')} style={styles.avatar} />
                  <View style={styles.driverInfo}>
                      <Text style={styles.driverNameDetail}>{selectedDriver.name}</Text>
                      <Text style={styles.cabNumber}>{selectedDriver.cabNumber}</Text>
                  </View>
                  <TouchableOpacity onPress={handleDeselectDriver} style={styles.closeButton}>
                      <MaterialIcons name="close" size={24} color={Colors.text} />
                  </TouchableOpacity>
              </View>
              <LinearGradient colors={[Colors.lightGray, '#ffffff']} style={styles.distanceContainer}>
                  <FontAwesome5 name="road" size={18} color={Colors.primary} />
                  <Text style={styles.distanceText}>
                  {(() => {
                    const branch = branches.find(b => b.id === selectedDriver.branch_id);
                    if (!branch || !branch.location || !branch.location.includes(',')) return 'Calculating...';
                    const [lat, lng] = branch.location.split(',').map(Number);
                    const branchCoords = { latitude: lat, longitude: lng };
                    return `${getDistance(selectedDriver.location.latitude, selectedDriver.location.longitude, branchCoords.latitude, branchCoords.longitude).toFixed(1)} km to branch`;
                  })()}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                        const branch = branches.find(b => b.id === selectedDriver.branch_id);
                        handleNavigateToBranch(selectedDriver.location, branch?.location);
                    }} 
                    style={styles.directionsButton}
                  >
                      <FontAwesome5 name="directions" size={18} color={Colors.white} />
                  </TouchableOpacity>
              </LinearGradient>
                          <View style={styles.branchContainer}>
                  <Text style={styles.branchLabel}>Branch:</Text>
                  <Text style={styles.branchName}>{branches.find(b => b.id === selectedDriver.branch_id)?.name || 'Not Assigned'}</Text>
                  <TouchableOpacity onPress={() => setBranchModalVisible(true)} style={styles.changeBranchButton}>
                      <Text style={styles.changeBranchButtonText}>Change</Text>
                  </TouchableOpacity>
              </View>
              <FlatList data={selectedDriver.students} renderItem={({ item }) => renderStudentItem({ item, driver: selectedDriver })} keyExtractor={item => item.id} showsVerticalScrollIndicator={false} />
            </View>
          ) : (
              <View style={{flex: 1}}>
                  <Text style={styles.title}>On-Duty Drivers</Text>
                  <FlatList data={drivers} renderItem={renderDriverItem} keyExtractor={item => item.id} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContentContainer} />
              </View>
          )

      </Animatable.View>

      {/* Student Details Modal */}
      <Modal
        visible={isStudentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsStudentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Details</Text>
              <TouchableOpacity
                onPress={() => setIsStudentModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedStudentDetails && (
              <View style={styles.studentDetailsContainer}>
                <Image 
                  source={selectedStudentDetails.avatar ? { uri: `${API_URL}${selectedStudentDetails.avatar}` } : require('../../assets/Avartar.png')} 
                  style={styles.studentDetailAvatar} 
                />
                <Text style={styles.studentDetailName}>{selectedStudentDetails.name}</Text>
                <Text style={styles.studentDetailInfo}>Driver: {selectedStudentDetails.driverName}</Text>
                <Text style={styles.studentDetailInfo}>Phone: {selectedStudentDetails.phone || 'Not provided'}</Text>
                {selectedStudentDetails.pickupTime && (
                  <Text style={styles.studentDetailInfo}>Pickup Time: {selectedStudentDetails.pickupTime}</Text>
                )}
                <View style={[styles.statusBadge, {
                  backgroundColor: selectedStudentDetails.pickedUp ? '#4CAF50' : '#FF9800'
                }]}>
                  <Text style={styles.statusBadgeText}>
                    {selectedStudentDetails.pickedUp ? 'Picked Up' : 'Pending Pickup'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { ...StyleSheet.absoluteFillObject },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  fullMapButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  lottie: { width: 60, height: 60, marginRight: 10 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: Colors.white, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, minHeight: height * 0.35, maxHeight: height * 0.8, backgroundColor: 'rgba(255, 255, 255, 0.85)', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 15 },
  minimizedBottomContainer: {
    minHeight: 80,
    maxHeight: 120,
  },
  handleBar: { width: 50, height: 6, backgroundColor: Colors.lightGray, borderRadius: 3, alignSelf: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#4A4A4A', marginBottom: 15, textAlign: 'center' },
  listContentContainer: { paddingBottom: 20 },
  driverItemContainer: { marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6, borderRadius: 25 },
  driverItem: { borderRadius: 20, overflow: 'hidden' },
  driverItemGradient: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 25 },
  avatar: { width: 55, height: 55, borderRadius: 27.5, marginRight: 15, borderWidth: 2, borderColor: Colors.white },
  driverInfo: { flex: 1 },
  driverActions: { flexDirection: 'row', alignItems: 'center' },
  deleteButton: { marginLeft: 10, padding: 8, backgroundColor: 'rgba(255, 95, 109, 0.5)', borderRadius: 20 },
  driverName: { fontSize: 19, fontWeight: '700', color: Colors.white },
  driverNameDetail: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  cabNumber: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', marginTop: 4 },
  studentCountContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  studentCountText: { color: Colors.white, fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
  driverDetailHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  closeButton: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 20 },
  studentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  studentTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pickupTime: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '500',
  },
  studentAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  studentName: { fontSize: 17, color: '#4A4A4A', fontWeight: '600' },
  pickupButton: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  pickupButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 14, marginLeft: 8 },
  studentInfoContainer: { flex: 1, marginLeft: 10 },
  navigateButton: { padding: 12, borderRadius: 25, backgroundColor: Colors.accent, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  studentStatus: { fontSize: 14, color: '#888', marginTop: 2 },
  distanceContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 15, padding: 12, borderRadius: 15 },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 10,
  },
  directionsButton: {
    marginLeft: 'auto',
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 20,
  },
  schoolMarker: { 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  schoolIconContainer: {
    backgroundColor: Colors.primary, 
    padding: 15, 
    borderRadius: 30, 
    borderColor: Colors.white, 
    borderWidth: 3, 
    shadowColor: '#000', 
    shadowRadius: 8, 
    shadowOpacity: 0.4, 
    elevation: 10,
    zIndex: 2,
  },
  schoolPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    zIndex: 1,
  },
  driverMarkerContainer: { padding: 3, backgroundColor: Colors.white, borderRadius: 30, shadowColor: '#000', shadowRadius: 6, shadowOpacity: 0.3, elevation: 7 },
  driverMarkerImage: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: '#FFC371' },
  studentMarker: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  branchContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eee', marginTop: 10 },
  branchLabel: { fontSize: 16, fontWeight: '600', color: '#555' },
  branchName: { flex: 1, fontSize: 16, color: Colors.primary, marginLeft: 10 },
  changeBranchButton: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: Colors.accent, borderRadius: 20 },
  changeBranchButtonText: { color: Colors.white, fontWeight: 'bold' },
  branchSelectItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  branchSelectItemText: { fontSize: 18, textAlign: 'center' },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 30,
    bottom: height * 0.35 + 20,
    backgroundColor: Colors.accent,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowRadius: 5,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  modalButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 10,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  activeTabButtonText: {
    color: Colors.primary,
  },
  formContainer: {
    flex: 1,
    padding: 10,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  studentDetailsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  studentDetailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  studentDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  studentDetailInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  statusBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default LiveCabScreen;
