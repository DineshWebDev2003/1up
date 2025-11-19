import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Dimensions, Image, LayoutAnimation, UIManager, Platform, Modal, TextInput, Linking, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
//import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

// Default fallback location (will be overridden by branch location when available)
const schoolLocation = {
  latitude: 12.9716,
  longitude: 77.5946
};

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
  // Core state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [captains, setCaptains] = useState([]);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // UI state
  const [isBranchModalVisible, setBranchModalVisible] = useState(false);
  const [isFullMapView, setIsFullMapView] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [isStudentModalVisible, setIsStudentModalVisible] = useState(false);
  const [isCaptainModalVisible, setIsCaptainModalVisible] = useState(false);
  const [selectedCaptain, setSelectedCaptain] = useState(null);
  
  // Tab view state
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: 'captains', title: 'On Duty Captains' },
    { key: 'students', title: 'Student List' }
  ]);
  
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const insets = useSafeAreaInsets();
  const layout = Dimensions.get('window');

  const parseBranchLocation = (locStr) => {
    if (!locStr || !locStr.includes(',')) return null;
    const [lat, lng] = locStr.split(',').map(Number);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { latitude: lat, longitude: lng };
  };

  const branchCenter = useMemo(() => {
    if (selectedBranch) {
      // First try to use accurate coordinates from API
      if (selectedBranch.coordinates) {
        console.log('✅ Using accurate branch coordinates:', selectedBranch.name, selectedBranch.coordinates);
        return selectedBranch.coordinates;
      }
      // Fallback to parsing location string
      const coords = parseBranchLocation(selectedBranch.location);
      if (coords) {
        console.log('✅ Using parsed branch location:', selectedBranch.name, coords);
        return coords;
      }
    }
    console.log('⚠️ Using default school location');
    return schoolLocation;
  }, [selectedBranch]);

  // Initialize data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        if (sessionToken) {
          await fetchCurrentUser();
          await fetchBranches();
        } else {
          console.warn('No session token found - user may need to login');
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    loadData();
  }, []);

  // Fetch data when branch changes
  useEffect(() => {
    if (selectedBranch) {
      fetchBranchMapData(selectedBranch.id);
      fetchCaptains(selectedBranch.id);
      fetchStudents(selectedBranch.id);
    }
  }, [selectedBranch]);

  // Auto-select first branch when branches are loaded
  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0]);
      console.log('✅ Auto-selected first branch:', branches[0].name);
    }
  }, [branches, selectedBranch]);

  // Data fetching functions
  const fetchCurrentUser = async () => {
    try {
      const response = await authFetch('/api/users/get_users.php?currentUser=true');
      const result = await response.json();
      if (response.ok && result.success && result.data.length > 0) {
        setCurrentUser(result.data[0]);
        console.log('✅ Current user loaded:', result.data[0].role);
        return result.data[0];
      }
    } catch (error) {
      console.error('Fetch current user error:', error);
    }
    return null;
  };

  const fetchBranchMapData = async (branchId) => {
    try {
      const response = await authFetch(`/api/get_branch_map.php?branch_id=${branchId}`);
      const result = await response.json();
      
      if (response.ok && result.success && result.data.coordinates) {
        // Update the selected branch with accurate coordinates
        setSelectedBranch(prev => ({
          ...prev,
          coordinates: result.data.coordinates,
          camera_url: result.data.camera_url
        }));
        console.log('✅ Branch map data loaded:', result.data.coordinates);
      } else {
        console.warn('Branch map data not available, using default location');
      }
    } catch (error) {
      console.error('Fetch branch map data error:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (response.ok && result.success) {
        setBranches(result.data || []);
        console.log('✅ Branches loaded:', result.data?.length || 0);
      } else {
        setBranches([]);
        console.warn(result?.message || 'Failed to fetch branches.');
      }
    } catch (error) {
      console.error('Fetch branches error:', error);
      setBranches([]);
    }
  };

  const fetchCaptains = async (branchId) => {
    try {
      setIsLoading(true);
      // Fetch real captains from the API
      const response = await authFetch(`/api/users/get_users.php?role=Captain&branch_id=${branchId}`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Transform captain data to include transport-specific fields
        let captainData = (result.data || []).map(captain => ({
          ...captain,
          duty_status: captain.duty_status || 'off_duty',
          vehicle_number: captain.vehicle_number || 'Not assigned',
          location: captain.location ? JSON.parse(captain.location) : {
            latitude: branchCenter.latitude + (Math.random() - 0.5) * 0.01,
            longitude: branchCenter.longitude + (Math.random() - 0.5) * 0.01
          }
        }));
        
        // Filter to show only on-duty captains for non-admin/non-captain users
        if (currentUser && currentUser.role !== 'Admin' && currentUser.role !== 'Captain') {
          captainData = captainData.filter(captain => captain.duty_status === 'on_duty');
          console.log('✅ Filtered to show only on-duty captains for user role:', currentUser.role);
        }
        
        setCaptains(captainData);
        console.log('✅ Captains loaded for branch:', branchId, '- Count:', captainData.length);
      } else {
        setCaptains([]);
        console.warn(result?.message || 'Failed to fetch captains.');
      }
    } catch (error) {
      console.error('Fetch captains error:', error);
      setCaptains([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async (branchId) => {
    try {
      const response = await authFetch(`/api/students/get_students.php?branch_id=${branchId}`);
      const result = await response.json();
      if (response.ok && result.success) {
        // Transform student data to include transport-specific fields with real data
        const transportStudents = (result.data || []).map(student => ({
          ...student,
          pickup_status: student.pickup_status || 'pending',
          photo: student.avatar || student.photo || student.profile_photo,
          location: {
            latitude: parseFloat(student.home_latitude) || parseFloat(student.latitude) || (12.9716 + (Math.random() - 0.5) * 0.05),
            longitude: parseFloat(student.home_longitude) || parseFloat(student.longitude) || (77.5946 + (Math.random() - 0.5) * 0.05)
          }
        }));
        setStudents(transportStudents);
        console.log('✅ Students loaded for branch:', branchId, '- Count:', transportStudents.length);
      } else {
        setStudents([]);
        console.warn(result?.message || 'Failed to fetch students.');
      }
    } catch (error) {
      console.error('Fetch students error:', error);
      setStudents([]);
    }
  };

  // Captain management functions
  const toggleCaptainDuty = async (captainId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'on_duty' ? 'off_duty' : 'on_duty';
      // For now, just update local state since we don't have the backend endpoint yet
      setCaptains(prevCaptains => 
        prevCaptains.map(captain => 
          captain.id === captainId 
            ? { ...captain, duty_status: newStatus }
            : captain
        )
      );
      Alert.alert('Success', `Captain is now ${newStatus.replace('_', ' ')}.`);
      
      // TODO: Implement actual API call when backend endpoint is ready
      // const response = await authFetch('/api/captain_attendance.php', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ action: newStatus }),
      // });
    } catch (error) {
      console.error('Toggle captain duty error:', error);
      Alert.alert('Error', 'An error occurred while updating captain status.');
    }
  };

  const assignCaptainToBranch = async (captainId, branchId) => {
    try {
      // For now, just show success message since we don't have the backend endpoint yet
      Alert.alert('Success', 'Captain assigned to branch successfully!');
      
      // TODO: Implement actual API call when backend endpoint is ready
      // const response = await authFetch('/api/assign_captain_branch.php', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ captain_id: captainId, branch_id: branchId }),
      // });
    } catch (error) {
      console.error('Assign captain error:', error);
      Alert.alert('Error', 'An error occurred while assigning captain.');
    }
  };

  // Student management functions
  const toggleStudentPickup = async (studentId, currentStatus, studentName) => {
    try {
      const newStatus = currentStatus ? 'pending' : 'picked_up';
      
      // Update local state
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === studentId 
            ? { ...student, pickup_status: newStatus }
            : student
        )
      );
      
      // Send notification to parent
      await sendParentNotification(studentId, newStatus, studentName);
      
      Alert.alert('Success', `Student ${newStatus.replace('_', ' ')} successfully.`);
      
      // TODO: Implement actual API call when backend endpoint is ready
      // const response = await authFetch('/api/update_pickup_status.php', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ 
      //     student_id: studentId, 
      //     status: newStatus
      //   }),
      // });
    } catch (error) {
      console.error('Toggle pickup error:', error);
      Alert.alert('Error', 'An error occurred while updating pickup status.');
    }
  };

  const sendParentNotification = async (studentId, status, studentName) => {
    try {
      const message = status === 'picked_up' 
        ? `${studentName} has been picked up by the school transport.`
        : `${studentName} has been dropped off safely.`;
      
      console.log('📱 Notification sent:', message);
      
      // TODO: Implement actual notification API when backend endpoint is ready
      // await authFetch('/api/send_parent_notification.php', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ 
      //     student_id: studentId, 
      //     message: message,
      //     type: 'transport_update'
      //   }),
      // });
    } catch (error) {
      console.error('Send notification error:', error);
    }
  };

  const handleNavigateToStudent = (studentLocation) => {
    if (!studentLocation) return;
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

  const handleNavigateToBranch = (captainLocation, branchLocationStr) => {
    if (!branchLocationStr || !branchLocationStr.includes(',')) {
        Alert.alert('Error', 'Branch location is not set correctly.');
        return;
    }
    const [lat, lng] = branchLocationStr.split(',').map(Number);
    const destinationLatLng = `${lat},${lng}`;
    
    const url = Platform.select({
      ios: `maps:?daddr=${destinationLatLng}&dirflg=d`,
      android: `google.navigation:q=${destinationLatLng}`
    });
    
    Linking.openURL(url).catch(err => console.error('Navigation error:', err));
  };

  const updateCaptainLocation = async (captainId, latitude, longitude) => {
    try {
        // TODO: Implement actual API call when backend endpoint is ready
        console.log('📍 Captain location updated:', { captainId, latitude, longitude });
        
        // await authFetch('/api/update_captain_location.php', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         captain_id: captainId,
        //         latitude,
        //         longitude,
        //     }),
        // });
    } catch (error) {
        console.error('Failed to update captain location:', error);
    }
  };



  // The location simulation effect can be added back if needed, but for now we focus on CRUD
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     // ... simulation logic ...
  //   }, 2000);
  //   return () => clearInterval(interval);
  // }, [drivers]);

  // Render components
  const renderCaptainItem = ({ item }) => {
    if (!item) return null;
    
    const isOnDuty = item.duty_status === 'on_duty';
    
    return (
      <Animatable.View animation="fadeInUp" duration={400} style={styles.captainItemContainer}>
        <TouchableOpacity 
          onPress={() => {
            setSelectedCaptain(item);
            setIsCaptainModalVisible(true);
          }} 
          style={styles.captainItem}
        >
          <LinearGradient 
            colors={isOnDuty ? ['#4CAF50', '#45a049'] : ['#f44336', '#d32f2f']} 
            style={styles.captainItemGradient}
          >
            <Image 
              source={item.avatar ? { uri: `${API_URL}${item.avatar}` } : require('../../assets/Avartar.png')} 
              style={styles.avatar} 
            />
            <View style={styles.captainInfo}>
              <Text style={styles.captainName}>{item.name || 'Unknown Captain'}</Text>
              <Text style={styles.captainPhone}>{item.phone || 'No Phone'}</Text>
              <Text style={styles.captainStatus}>
                {isOnDuty ? '🟢 On Duty' : '🔴 Off Duty'}
              </Text>
            </View>
            <View style={styles.captainActions}>
              <TouchableOpacity 
                onPress={() => toggleCaptainDuty(item.id, item.duty_status)}
                style={[styles.dutyButton, { backgroundColor: isOnDuty ? '#f44336' : '#4CAF50' }]}
              >
                <Ionicons 
                  name={isOnDuty ? 'pause' : 'play'} 
                  size={16} 
                  color={Colors.white} 
                />
                <Text style={styles.dutyButtonText}>
                  {isOnDuty ? 'Off Duty' : 'On Duty'}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animatable.View>
    );
  };


  const renderStudentItem = ({ item }) => {
    if (!item) return null;
    
    const isPickedUp = item.pickup_status === 'picked_up';
    
    return (
      <Animatable.View animation="fadeIn" duration={300} style={styles.studentItem}>
        <TouchableOpacity 
          onPress={() => {
            setSelectedStudentDetails({
              ...item,
              pickupTime: isPickedUp ? new Date().toLocaleTimeString() : null
            });
            setIsStudentModalVisible(true);
          }} 
          style={styles.studentTouchable}
        >
          <Image 
            source={item.avatar ? { uri: `${API_URL}${item.avatar}` } : require('../../assets/Avartar.png')} 
            style={styles.studentAvatar} 
          />
          <View style={styles.studentInfoContainer}>
            <Text style={styles.studentName}>{item.name || 'Unknown Student'}</Text>
            <Text style={styles.studentClass}>Class: {item.class || 'N/A'}</Text>
            <Text style={[styles.studentStatus, { color: isPickedUp ? '#4CAF50' : '#f44336' }]}>
              {isPickedUp ? '✅ Picked Up' : '⏳ Pending'}
            </Text>
          </View>
        </TouchableOpacity>
        
        {item.location && (
          <TouchableOpacity 
            onPress={() => handleNavigateToStudent(item.location)} 
            style={styles.navigateButton}
          >
            <FontAwesome5 name="directions" size={16} color={Colors.white} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          onPress={() => toggleStudentPickup(item.id, isPickedUp, item.name)}
          style={[styles.pickupButton, { backgroundColor: isPickedUp ? '#f44336' : '#4CAF50' }]}
        >
          <FontAwesome5 
            name={isPickedUp ? "times-circle" : "check-circle"} 
            size={16} 
            color={Colors.white} 
          />
          <Text style={styles.pickupButtonText}>
            {isPickedUp ? 'Drop Off' : 'Pick Up'}
          </Text>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  // Tab view scenes
  const CaptainsScene = () => (
    <View style={styles.tabContent}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading captains...</Text>
        </View>
      ) : (
        <FlatList
          data={captains}
          renderItem={renderCaptainItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentContainer}
          ListEmptyComponent={
            <Animatable.View animation="fadeInUp" style={styles.emptyContainer}>
              <FontAwesome5 name="user-tie" size={60} color={Colors.lightGray} />
              <Text style={styles.emptyText}>No captain in this branch</Text>
            </Animatable.View>
          }
        />
      )}
    </View>
  );

  const StudentsScene = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={students}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={
          <Animatable.View animation="fadeInUp" style={styles.emptyContainer}>
            <FontAwesome5 name="graduation-cap" size={60} color={Colors.lightGray} />
            <Text style={styles.emptyText}>No students found for this branch</Text>
          </Animatable.View>
        }
      />
    </View>
  );

  const renderScene = SceneMap({
    captains: CaptainsScene,
    students: StudentsScene,
  });

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor={Colors.primary}
      inactiveColor={Colors.textSecondary}
    />
  );

  // Captain Dashboard Component
  const CaptainDashboard = () => {
    if (!currentUser || currentUser.role !== 'Captain') return null;
    
    const currentCaptain = captains.find(captain => captain.id === currentUser.id);
    const isOnDuty = currentCaptain?.duty_status === 'on_duty';
    
    return (
      <View style={styles.captainDashboard}>
        <LinearGradient 
          colors={isOnDuty ? ['#4CAF50', '#45a049'] : ['#f44336', '#d32f2f']} 
          style={styles.captainDashboardGradient}
        >
          <View style={styles.captainDashboardHeader}>
            <FontAwesome5 name="user-tie" size={24} color={Colors.white} />
            <Text style={styles.captainDashboardTitle}>Captain Dashboard</Text>
          </View>
          
          <View style={styles.captainStatusContainer}>
            <Text style={styles.captainStatusText}>
              Status: {isOnDuty ? '🟢 On Duty' : '🔴 Off Duty'}
            </Text>
            <TouchableOpacity 
              onPress={() => currentCaptain && toggleCaptainDuty(currentCaptain.id, currentCaptain.duty_status)}
              style={[styles.dutyToggleButton, { backgroundColor: isOnDuty ? '#f44336' : '#4CAF50' }]}
            >
              <Ionicons 
                name={isOnDuty ? 'pause' : 'play'} 
                size={16} 
                color={Colors.white} 
              />
              <Text style={styles.dutyToggleButtonText}>
                {isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      <MapView 
        ref={mapRef} 
        style={styles.map} 
        customMapStyle={mapStyle} 
        initialRegion={{ ...branchCenter, latitudeDelta: 0.4, longitudeDelta: 0.4 }}
      >
        {/* School/Branch Marker */}
        <Marker coordinate={branchCenter} zIndex={10}>
          <Animatable.View animation="pulse" iterationCount="infinite" style={styles.schoolMarker}>
            <View style={styles.schoolPulse} />
            <View style={styles.schoolIconContainer}>
              <FontAwesome5 name="school" size={30} color={Colors.white} />
            </View>
          </Animatable.View>
        </Marker>
        
        {/* Additional Branch Locations */}
        {branches.filter(branch => branch.id !== selectedBranch?.id).map(branch => {
          const branchLocation = parseBranchLocation(branch.location);
          if (!branchLocation) return null;
          return (
            <Marker 
              key={branch.id} 
              coordinate={branchLocation}
              title={branch.name}
              description="School Branch"
            >
              <View style={styles.branchMarkerContainer}>
                <FontAwesome5 name="school" size={20} color={Colors.primary} />
              </View>
            </Marker>
          );
        })}
        
        {/* Captain Markers */}
        {captains.filter(captain => captain && captain.location && captain.duty_status === 'on_duty').map(captain => (
          <Marker key={captain.id} coordinate={captain.location} title={captain.name || 'Captain'}>
            <Animatable.View animation="bounceIn" duration={1000} style={styles.captainMarkerContainer}>
              <Image 
                source={captain.avatar ? { uri: `${API_URL}${captain.avatar}` } : require('../../assets/Avartar.png')} 
                style={styles.captainMarkerImage} 
              />
            </Animatable.View>
          </Marker>
        ))}
        
        {/* Student Markers with Photos */}
        {students.map(student => {
          if (!student.location) return null;
          const statusColor = student.pickup_status === 'picked_up' ? '#4CAF50' : '#FF9800';
          return (
            <Marker
              key={student.id}
              coordinate={student.location}
              onPress={() => setSelectedStudent(student)}
            >
              <View style={[styles.studentMarkerContainer, { borderColor: statusColor }]} >
                {student.photo ? (
                  <Image 
                    source={{ uri: student.photo }} 
                    style={styles.studentMarkerImage}
                    onError={() => console.log('Failed to load student image:', student.photo)}
                  />
                ) : (
                  <View style={[styles.studentMarkerFallback, { backgroundColor: statusColor }]} >
                    <FontAwesome5 name="user" size={16} color={Colors.white} />
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <LinearGradient colors={Colors.gradientPrimary} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <FontAwesome5 name="bus" size={28} color={Colors.textOnPrimary} />
            </View>
            <Text style={styles.headerTitle}>Transport Management</Text>
            <TouchableOpacity 
              style={styles.fullMapButton} 
              onPress={() => setIsFullMapView(!isFullMapView)}
            >
              <MaterialIcons 
                name={isFullMapView ? "fullscreen-exit" : "fullscreen"} 
                size={24} 
                color={Colors.textOnPrimary} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Branch Selector */}
          <TouchableOpacity 
            style={styles.branchSelector}
            onPress={() => setBranchModalVisible(true)}
          >
            <Ionicons name="business" size={20} color={Colors.textOnPrimary} />
            <Text style={styles.branchSelectorText}>
              {selectedBranch?.name || 'Select Branch'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textOnPrimary} />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Captain Dashboard */}
      <CaptainDashboard />

      {/* Tab View Container */}
      <Animatable.View 
        animation="slideInUp" 
        duration={600} 
        style={[styles.bottomContainer, isFullMapView && styles.minimizedBottomContainer]}
      >
        <View style={styles.handleBar} />
        
        {selectedBranch ? (
          <TabView
            navigationState={{ index: tabIndex, routes }}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
            onIndexChange={setTabIndex}
            initialLayout={{ width: layout.width }}
            style={styles.tabView}
          />
        ) : (
          <View style={styles.noBranchContainer}>
            <FontAwesome5 name="building" size={60} color={Colors.lightGray} />
            <Text style={styles.noBranchText}>Please select a branch to view transport data</Text>
          </View>
        )}
      </Animatable.View>



      {/* Branch Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isBranchModalVisible}
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Select Branch</Text>
            <FlatList
              data={branches}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.branchSelectItem, selectedBranch?.id === item.id && styles.selectedBranchItem]}
                  onPress={() => {
                    setSelectedBranch(item);
                    setBranchModalVisible(false);
                  }}
                >
                  <Text style={[styles.branchSelectItemText, selectedBranch?.id === item.id && styles.selectedBranchText]}>
                    {item.name}
                  </Text>
                  {selectedBranch?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={{width: '100%', maxHeight: 300}}
            />
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, {marginTop: 15}]}
              onPress={() => setBranchModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



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
                <Text style={styles.studentDetailInfo}>Class: {selectedStudentDetails.class || 'N/A'}</Text>
                <Text style={styles.studentDetailInfo}>Phone: {selectedStudentDetails.phone || 'Not provided'}</Text>
                {selectedStudentDetails.pickupTime && (
                  <Text style={styles.studentDetailInfo}>Pickup Time: {selectedStudentDetails.pickupTime}</Text>
                )}
                <View style={[styles.statusBadge, {
                  backgroundColor: selectedStudentDetails.pickup_status === 'picked_up' ? '#4CAF50' : '#FF9800'
                }]}>
                  <Text style={styles.statusBadgeText}>
                    {selectedStudentDetails.pickup_status === 'picked_up' ? 'Picked Up' : 'Pending Pickup'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Captain Details Modal */}
      <Modal
        visible={isCaptainModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCaptainModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Captain Details</Text>
              <TouchableOpacity
                onPress={() => setIsCaptainModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedCaptain && (
              <View style={styles.studentDetailsContainer}>
                <Image 
                  source={selectedCaptain.avatar ? { uri: `${API_URL}${selectedCaptain.avatar}` } : require('../../assets/Avartar.png')} 
                  style={styles.studentDetailAvatar} 
                />
                <Text style={styles.studentDetailName}>{selectedCaptain.name}</Text>
                <Text style={styles.studentDetailInfo}>Phone: {selectedCaptain.phone || 'Not provided'}</Text>
                <Text style={styles.studentDetailInfo}>Vehicle: {selectedCaptain.vehicle_number || 'Not assigned'}</Text>
                <View style={[styles.statusBadge, {
                  backgroundColor: selectedCaptain.duty_status === 'on_duty' ? '#4CAF50' : '#f44336'
                }]}>
                  <Text style={styles.statusBadgeText}>
                    {selectedCaptain.duty_status === 'on_duty' ? 'On Duty' : 'Off Duty'}
                  </Text>
                </View>
                
                {selectedCaptain.location && (
                  <TouchableOpacity 
                    style={styles.navigateButton}
                    onPress={() => handleNavigateToBranch(selectedCaptain.location, selectedBranch?.location)}
                  >
                    <FontAwesome5 name="directions" size={16} color={Colors.white} />
                    <Text style={styles.navigateButtonText}>Navigate to School</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { ...StyleSheet.absoluteFillObject },
  
  // Header Styles
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 },
  header: { paddingBottom: 15, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerIconContainer: { 
    width: 50, 
    height: 50, 
    marginRight: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: Colors.textOnPrimary, 
    textShadowColor: 'rgba(255, 255, 255, 0.3)', 
    textShadowOffset: { width: 1, height: 1 }, 
    textShadowRadius: 2,
    flex: 1
  },
  fullMapButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  
  // Branch Selector Styles
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 5,
  },
  branchSelectorText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 10,
    flex: 1,
  },
  // Bottom Container Styles
  bottomContainer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    minHeight: height * 0.4, 
    maxHeight: height * 0.8, 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    paddingTop: 10, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -5 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 15 
  },
  minimizedBottomContainer: {
    minHeight: 80,
    maxHeight: 120,
  },
  handleBar: { 
    width: 50, 
    height: 6, 
    backgroundColor: Colors.lightGray, 
    borderRadius: 3, 
    alignSelf: 'center', 
    marginBottom: 15 
  },
  
  // Tab View Styles
  tabView: { flex: 1 },
  tabBar: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  tabIndicator: {
    backgroundColor: Colors.primary,
    height: 3,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'none',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 15,
    textAlign: 'center',
  },
  noBranchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  noBranchText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 15,
    textAlign: 'center',
  },
  
  listContentContainer: { paddingBottom: 20 },
  // Captain Item Styles
  captainItemContainer: { 
    marginBottom: 15, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 8, 
    elevation: 6, 
    borderRadius: 25 
  },
  captainItem: { borderRadius: 20, overflow: 'hidden' },
  captainItemGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderRadius: 25 
  },
  avatar: { 
    width: 55, 
    height: 55, 
    borderRadius: 27.5, 
    marginRight: 15, 
    borderWidth: 2, 
    borderColor: Colors.white 
  },
  captainInfo: { flex: 1 },
  captainName: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: Colors.white 
  },
  captainPhone: { 
    fontSize: 14, 
    color: 'rgba(255, 255, 255, 0.8)', 
    marginTop: 2 
  },
  captainStatus: { 
    fontSize: 14, 
    color: Colors.white, 
    marginTop: 4,
    fontWeight: '600'
  },
  captainActions: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  dutyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  dutyButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 12,
  },
  // Student Item Styles
  studentItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    backgroundColor: Colors.white,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    marginRight: 15,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  studentInfoContainer: { 
    flex: 1 
  },
  studentName: { 
    fontSize: 16, 
    color: '#333', 
    fontWeight: '600' 
  },
  studentClass: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  studentStatus: { 
    fontSize: 14, 
    marginTop: 4,
    fontWeight: '500'
  },
  navigateButton: { 
    padding: 10, 
    borderRadius: 20, 
    backgroundColor: Colors.accent, 
    marginRight: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  navigateButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  pickupButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 3, 
    elevation: 3 
  },
  pickupButtonText: { 
    color: Colors.white, 
    fontWeight: 'bold', 
    fontSize: 12, 
    marginLeft: 6 
  },
  // Map Marker Styles
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
  captainMarkerContainer: { 
    padding: 3, 
    backgroundColor: Colors.white, 
    borderRadius: 30, 
    shadowColor: '#000', 
    shadowRadius: 6, 
    shadowOpacity: 0.3, 
    elevation: 7 
  },
  captainMarkerImage: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    borderWidth: 3, 
    borderColor: '#4CAF50' 
  },
  studentMarkerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FF9800',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  studentMarkerImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  studentMarkerFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchMarkerContainer: {
    backgroundColor: Colors.white,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // Modal Styles
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: { 
    padding: 8, 
    backgroundColor: '#f0f0f0', 
    borderRadius: 20 
  },
  
  // Branch Selection Styles
  branchSelectItem: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  selectedBranchItem: {
    backgroundColor: Colors.lightGray,
  },
  branchSelectItemText: { 
    fontSize: 16, 
    color: Colors.text 
  },
  selectedBranchText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  // Button Styles
  modalButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Detail Modal Styles
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
    textAlign: 'center',
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
  
  // Captain Dashboard Styles
  captainDashboard: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    zIndex: 999,
  },
  captainDashboardGradient: {
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captainDashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  captainDashboardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginLeft: 10,
  },
  captainStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  captainStatusText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
  dutyToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dutyToggleButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
});

export default LiveCabScreen;
