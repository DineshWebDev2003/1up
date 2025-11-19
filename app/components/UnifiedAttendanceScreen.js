import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, TextInput, Image, Modal, ScrollView, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
// NOTE: adjust import paths according to your folder layout
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { API_URL } from '../../config';
import Theme from '../constants/theme';
import { formatPhotoSource } from '../utils/imageUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* -------------------------------------------------------------------------- */
/*                       Unified Attendance Screen Component                  */
/* -------------------------------------------------------------------------- */
const UnifiedAttendanceScreen = () => {
  /* ----------------------------- State & refs ----------------------------- */
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [type, setType] = useState('all'); // all | student | staff
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('All');
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, unmarked: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [imageURL, setImageURL] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [userBranch, setUserBranch] = useState(null);
  const [userName, setUserName] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // New filter state
  const [canAccessAllBranches, setCanAccessAllBranches] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [viewMode, setViewMode] = useState('daily'); // daily | monthly
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [userDetailData, setUserDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSelectedMonth, setDetailSelectedMonth] = useState(new Date());

  /* ----------------------------- Load User Data --------------------------- */
  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role);
        setUserBranch(user.branch_id);
        setUserName(user.name || user.username || 'User');
        
        // Determine access level based on role
        const isAdmin = user.role === 'Admin' || user.branch_id == 1;
        const isFranchisee = user.role === 'Franchisee';
        const isTeacher = user.role === 'Teacher' || user.role === 'Tuition Teacher';
        
        setCanAccessAllBranches(isAdmin);
        
        // Auto-configure based on role
        if (isTeacher) {
          // Teachers can only see their branch and students
          setBranch(user.branch_id);
          setType('student');
        } else if (isFranchisee) {
          // Franchisees can see their branch(es) and both students/staff
          setBranch(user.branch_id);
          setType('all');
        } else if (isAdmin) {
          // Admins can see all branches and all types
          setBranch('All');
          setType('all');
        }
      }
    } catch (err) {
      console.log('User data load error:', err);
    }
  }, []);

  /* ----------------------------- Fetch Branches --------------------------- */
  const fetchBranches = useCallback(async () => {
    try {
      const res = await authFetch('/api/branches/get_branches.php');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const mapped = json.data.map(b => ({ 
          label: b.name ?? b.branch_name, 
          value: b.id ?? b.branch_id,
          id: b.id ?? b.branch_id
        }));
        
        setAvailableBranches(mapped);
        
        // Configure branch options based on user role and access level
        if (canAccessAllBranches) {
          // Admin can see all branches
          setBranches([{ label: '🏢 All Branches', value: 'All', id: 'All' }, ...mapped]);
        } else if (userRole === 'Franchisee') {
          // Franchisees see their assigned branches
          const userBranches = mapped.filter(b => 
            b.value == userBranch || 
            (Array.isArray(userBranch) && userBranch.includes(b.value))
          );
          setBranches(userBranches.length > 1 ? 
            [{ label: '🏢 My Branches', value: 'All', id: 'All' }, ...userBranches] : 
            userBranches
          );
        } else {
          // Teachers and other roles see only their branch
          const userBranchData = mapped.filter(b => b.value == userBranch);
          setBranches(userBranchData);
          if (userBranchData.length === 1) {
            setBranch(userBranchData[0].value);
          }
        }
      }
    } catch (err) {
      console.log('Branch fetch error:', err);
    }
  }, [userRole, userBranch, canAccessAllBranches]);

  /* -------------------------- Fetch Monthly Attendance ------------------- */
  const fetchMonthlyAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      let url = `/api/attendance/get_monthly_attendance_unified.php?year=${year}&month=${month}`;
      if (type !== 'all') url += `&type=${type}`;
      
      // Always apply branch filter unless user is admin and selected 'All'
      if (branch !== 'All' || !canAccessAllBranches) {
        const branchId = branch === 'All' ? userBranch : branch;
        url += `&branch_id=${branchId}`;
      }
      
      console.log('🔍 Fetching monthly attendance with URL:', url);
      console.log('🔍 Current type filter:', type);
      const res = await authFetch(url);
      const json = await res.json();
      console.log('📋 Monthly attendance API response:', json);
      if (json.success) {
        const { records: rec = [], summary: sum = {} } = json.data;
        console.log('📋 Monthly attendance records received:', rec);
        console.log('📋 Students in records:', rec.filter(r => r.type === 'student').length);
        console.log('📋 Staff in records:', rec.filter(r => r.type === 'staff').length);
        setMonthlyData(rec);
        setFiltered(rec);
        setSummary({
          total: sum.total || rec.length,
          present: sum.present || 0,
          absent: sum.absent || 0,
          unmarked: sum.unmarked || 0,
        });
      } else {
        setMonthlyData([]);
        setFiltered([]);
        setSummary({ total: 0, present: 0, absent: 0, unmarked: 0 });
      }
    } catch (err) {
      console.log('Monthly attendance fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, type, branch]);

  /* -------------------------- Fetch Daily Attendance ---------------------------- */
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const d = date.toISOString().split('T')[0];
      let url = `/api/attendance/get_unified_attendance.php?date=${d}`;
      if (type !== 'all') url += `&type=${type}`;
      
      // Always apply branch filter unless user is admin and selected 'All'
      if (branch !== 'All' || !canAccessAllBranches) {
        const branchId = branch === 'All' ? userBranch : branch;
        url += `&branch_id=${branchId}`;
      }
      
      console.log('🔍 Fetching attendance with URL:', url);
      const res = await authFetch(url);
      const json = await res.json();
      if (json.success) {
        const { records: rec = [], summary: sum = {} } = json.data;
        console.log('📋 Attendance records received:', rec);
        if (rec.length > 0) {
          console.log('👤 First record guardian photos:', {
            father_photo: rec[0].father_photo,
            mother_photo: rec[0].mother_photo,
            guardian_photo: rec[0].guardian_photo
          });
        }
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
  useEffect(() => { 
    loadUserData();
  }, [loadUserData]);
  
  // Fetch branches after user data is loaded
  useEffect(() => {
    if (userRole !== null) {
      fetchBranches();
    }
  }, [fetchBranches, userRole, userBranch]);
  useEffect(() => { 
    if (viewMode === 'daily') {
      fetchAttendance(); 
    } else {
      fetchMonthlyAttendance();
    }
  }, [fetchAttendance, fetchMonthlyAttendance, viewMode]);
  /* ----------------------------- Filter Function -------------------------- */
  const applyFilters = useCallback(() => {
    let filteredData = viewMode === 'monthly' ? monthlyData : records;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(r => r.status === statusFilter);
    }
    
    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filteredData = filteredData.filter(r => 
        `${r.name}`.toLowerCase().includes(q) || 
        `${r.id}`.includes(q) || 
        `${r.code}`.includes(q)
      );
    }
    
    setFiltered(filteredData);
  }, [records, statusFilter, search]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  /* ----------------------------- Status Filter Handler ------------------- */
  const handleStatusFilter = (status) => {
    if (statusFilter === status) {
      // If clicking the same filter, reset to show all
      setStatusFilter('all');
    } else {
      // Set new filter
      setStatusFilter(status);
    }
  };

  /* ----------------------------- Export Handler -------------------- */
  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      
      console.log('📄 Generating attendance report from current data...');
      
      // Use current filtered data for export
      if (!filtered || filtered.length === 0) {
        alert('No attendance data available to export. Please select a date with attendance records.');
        return;
      }
      
      // Add current date to records
      const exportData = filtered.map(record => ({
        ...record,
        date: date.toISOString().split('T')[0]
      }));
      
      // Generate CSV content
      const csvContent = generateCSV(exportData);
      
      // For React Native, we'll show the CSV content in an alert
      // In a web environment, this would download the file
      if (typeof document !== 'undefined') {
        // Web environment - download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `attendance_report_${date.toISOString().split('T')[0]}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          alert(`Attendance report exported successfully!\nRecords: ${exportData.length}`);
        } else {
          alert('CSV export not supported on this device.');
        }
      } else {
        // React Native environment - show data summary
        const summary = `Attendance Report - ${date.toISOString().split('T')[0]}\n\n` +
          `Total Records: ${exportData.length}\n` +
          `Present: ${exportData.filter(r => r.status === 'present').length}\n` +
          `Absent: ${exportData.filter(r => r.status === 'absent').length}\n` +
          `Unmarked: ${exportData.filter(r => !r.status || r.status === 'unmarked').length}\n\n` +
          `Branch: ${branch === 'All' ? 'All Branches' : (exportData[0]?.branch_name || 'Unknown')}\n` +
          `Type: ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n` +
          `Note: Full CSV export is available in web browser version.`;
        
        alert(summary);
      }
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  /* ----------------------------- CSV Generator -------------------- */
  const generateCSV = (data) => {
    if (!data || data.length === 0) {
      return 'Date,Name,ID/Code,Type,Branch,Status,In Time,Out Time,In Guardian,Out Guardian\n"No data available","","","","","","","","",""';
    }
    
    // CSV headers
    const headers = [
      'Date',
      'Name',
      'ID/Code',
      'Type',
      'Branch',
      'Status',
      'In Time',
      'Out Time',
      'In Guardian',
      'Out Guardian'
    ];
    
    // Convert data to CSV rows
    const rows = data.map(record => [
      record.date || '',
      record.name || 'Unknown',
      record.code || record.employee_id || record.id || '',
      record.type || 'student',
      record.branch_name || 'Unknown Branch',
      record.status || 'absent',
      record.in_time || '',
      record.out_time || '',
      record.in_guardian_name || '',
      record.out_guardian_name || ''
    ]);
    
    // Combine headers and rows
    const csvArray = [headers, ...rows];
    
    // Convert to CSV string
    return csvArray.map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  /* ----------------------------- Image Upload ----------------------------- */
  const handleImageUpload = async (image) => {
    const formData = new FormData();
    formData.append('image', image);

    try {
        const response = await fetch('http://10.123.210.139/school/1up/api/upload-avatar.php', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': 'Bearer your_token_here',
            },
        });

        const data = await response.json();
        if (data.success) {
            // Image uploaded successfully, update the state with the new image URL
            setImageURL(data.file_path);
        } else {
            console.error('Error uploading image:', data.message);
        }
    } catch (error) {
        console.error('Error uploading image:', error);
    }
  };

  /* ----------------------------- Avatar Helper ---------------------------- */
  const getAvatarSource = (item) => {
    if (!item) return require('../../assets/Avartar.png');
    
    // Try different avatar fields with proper URL handling
    if (item.avatar_url && item.avatar_url.trim() !== '') {
      return { uri: item.avatar_url.startsWith('http') ? item.avatar_url : `${API_URL}${item.avatar_url}` };
    }
    
    if (item.avatar && item.avatar.trim() !== '') {
      const avatarUrl = item.avatar.startsWith('http') ? item.avatar : `${API_URL}${item.avatar}`;
      return { uri: avatarUrl };
    }
    
    if (item.profile_image && item.profile_image.trim() !== '') {
      const avatarUrl = item.profile_image.startsWith('http') ? item.profile_image : `${API_URL}${item.profile_image}`;
      return { uri: avatarUrl };
    }
    
    if (item.profile_photo && item.profile_photo.trim() !== '') {
      const avatarUrl = item.profile_photo.startsWith('http') ? item.profile_photo : `${API_URL}${item.profile_photo}`;
      return { uri: avatarUrl };
    }
    
    return require('../../assets/Avartar.png');
  };

  /* ----------------------------- Guardian Photo Helper ---------------------------- */
  const getGuardianPhoto = (item, guardianType) => {
    if (!item) {
      console.log('❌ No item provided to getGuardianPhoto');
      return null;
    }
    
    console.log(`🔍 Getting guardian photo for ${guardianType}:`, {
      father_photo: item.father_photo,
      mother_photo: item.mother_photo,
      guardian_photo: item.guardian_photo,
      avatar: item.avatar
    });
    
    let photoField = null;
    const guardianTypeLower = guardianType?.toLowerCase();
    
    // Enhanced guardian type matching - handle various formats
    if (guardianTypeLower?.includes('father') || guardianTypeLower?.includes('dad') || guardianTypeLower?.includes('papa')) {
      photoField = item.father_photo;
    } else if (guardianTypeLower?.includes('mother') || guardianTypeLower?.includes('mom') || guardianTypeLower?.includes('mama')) {
      photoField = item.mother_photo;
    } else if (guardianTypeLower?.includes('guardian') || guardianTypeLower?.includes('relative') || guardianTypeLower?.includes('other')) {
      photoField = item.guardian_photo;
    } else {
      // If no specific match, try to match by guardian name with parent names
      const guardianName = guardianType?.toLowerCase();
      const fatherName = item.father_name?.toLowerCase();
      const motherName = item.mother_name?.toLowerCase();
      const guardianNameField = item.guardian_name?.toLowerCase();
      
      if (fatherName && guardianName?.includes(fatherName)) {
        photoField = item.father_photo;
      } else if (motherName && guardianName?.includes(motherName)) {
        photoField = item.mother_photo;
      } else if (guardianNameField && guardianName?.includes(guardianNameField)) {
        photoField = item.guardian_photo;
      } else {
        console.log(`❌ Unknown guardian type: ${guardianType}, trying fallback`);
        // Try father photo as default fallback
        photoField = item.father_photo || item.mother_photo || item.guardian_photo;
      }
    }
    
    console.log(`🔍 Guardian photo field for ${guardianType}:`, photoField);
    
    if (photoField && photoField.trim() !== '' && photoField !== 'null' && photoField !== 'undefined') {
      // Try direct URI first if it's already a full URL
      if (photoField.startsWith('http')) {
        console.log(`📸 Using direct URL:`, photoField);
        return { uri: photoField };
      }
      
      // Otherwise use formatPhotoSource
      const formattedSource = formatPhotoSource(photoField);
      console.log(`📸 Formatted photo source:`, formattedSource);
      return formattedSource;
    }
    
    // Fallback to student avatar if no guardian photo
    if (item.avatar || item.avatar_url || item.profile_image) {
      const avatarSource = getAvatarSource(item);
      console.log(`📸 Using student avatar as fallback:`, avatarSource);
      return avatarSource;
    }
    
    console.log(`❌ No photo found for ${guardianType}`);
    return null;
  };

  /* ----------------------------- UI Renderers ----------------------------- */
  const renderHeader = () => (
    <View style={Theme.components.container.light}>
      {/* Enhanced header with user info and role indicator */}
      <View style={styles.enhancedHeader}>
        <View style={styles.headerLeft}>
          <Text style={[Theme.typography.h4, styles.title]}>Attendance Report</Text>
          <View style={styles.userInfoRow}>
            <View style={[styles.roleChip, styles[`roleChip_${userRole?.toLowerCase().replace(' ', '_')}`]]}>
              <MaterialCommunityIcons 
                name={userRole === 'Admin' ? 'shield-crown' : 
                      userRole === 'Franchisee' ? 'store' : 
                      'school'} 
                size={12} 
                color={Colors.white} 
              />
              <Text style={styles.roleText}>{userRole}</Text>
            </View>
            <Text style={styles.welcomeText}>Welcome, {userName}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.downloadBtn, !canAccessAllBranches && userRole !== 'Franchisee' && styles.downloadBtnDisabled]} 
          onPress={handleDownloadPDF}
          disabled={loading || (!canAccessAllBranches && userRole !== 'Franchisee')}
        >
          <MaterialCommunityIcons 
            name="file-export" 
            size={20} 
            color={loading || (!canAccessAllBranches && userRole !== 'Franchisee') ? Colors.textSecondary : Colors.primary} 
          />
          <Text style={[styles.downloadText, { 
            color: loading || (!canAccessAllBranches && userRole !== 'Franchisee') ? Colors.textSecondary : Colors.primary 
          }]}>
            {loading ? 'Exporting...' : 'Export Data'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <Text style={styles.sectionLabel}>View Mode</Text>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity 
            style={[styles.viewModeBtn, viewMode === 'daily' && styles.viewModeBtnActive]} 
            onPress={() => setViewMode('daily')}
          >
            <MaterialCommunityIcons 
              name="calendar-today" 
              size={16} 
              color={viewMode === 'daily' ? Colors.textOnPrimary : Colors.textSecondary} 
            />
            <Text style={[styles.viewModeTxt, viewMode === 'daily' && styles.viewModeTxtActive]}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewModeBtn, viewMode === 'monthly' && styles.viewModeBtnActive]} 
            onPress={() => setViewMode('monthly')}
          >
            <MaterialCommunityIcons 
              name="calendar-month" 
              size={16} 
              color={viewMode === 'monthly' ? Colors.textOnPrimary : Colors.textSecondary} 
            />
            <Text style={[styles.viewModeTxt, viewMode === 'monthly' && styles.viewModeTxtActive]}>Monthly</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date + Type row */}
      <View style={styles.rowBetween}>
        {viewMode === 'daily' ? (
          <TouchableOpacity style={[Theme.components.button.primary, styles.dateBtn]} onPress={() => setShowDatePicker(true)}>
            <MaterialCommunityIcons name="calendar" size={18} color={Colors.textOnPrimary} />
            <Text style={[Theme.typography.button, styles.dateTxt]}>{date.toISOString().split('T')[0]}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[Theme.components.button.primary, styles.dateBtn]} onPress={() => setShowDatePicker(true)}>
            <MaterialCommunityIcons name="calendar-month" size={18} color={Colors.textOnPrimary} />
            <Text style={[Theme.typography.button, styles.dateTxt]}>
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.typeBar}>
          {(userRole === 'Admin' || userRole === 'Franchisee' ? ['all', 'student', 'staff'] : ['student']).map(t => (
            <TouchableOpacity key={t} style={[styles.typeChip, type === t && styles.typeChipActive]} onPress={() => setType(t)}>
              <Text style={[styles.typeChipTxt, type === t && styles.typeChipTxtActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Enhanced Branch Selection */}
      {branches.length > 0 && (
        <View style={styles.branchSelectionContainer}>
          <Text style={styles.sectionLabel}>📍 Branch Selection</Text>
          {branches.length === 1 ? (
            // Single branch - show as info card
            <View style={styles.singleBranchCard}>
              <MaterialCommunityIcons name="map-marker" size={20} color={Colors.primary} />
              <Text style={styles.singleBranchText}>{branches[0].label}</Text>
              {userRole === 'Teacher' && (
                <View style={styles.teacherBadge}>
                  <Text style={styles.teacherBadgeText}>Your Branch</Text>
                </View>
              )}
            </View>
          ) : (
            // Multiple branches - show as enhanced picker
            <View style={styles.enhancedPickerWrap}>
              <MaterialCommunityIcons name="office-building" size={16} color={Colors.primary} style={styles.pickerIcon} />
              <Picker 
                selectedValue={branch} 
                onValueChange={v => setBranch(v)}
                style={styles.enhancedPicker}
                enabled={userRole !== 'Teacher' && userRole !== 'Tuition Teacher'}
              >
                {branches.map(b => (
                  <Picker.Item 
                    key={b.value} 
                    label={b.label} 
                    value={b.value}
                    color={Colors.text}
                  />
                ))}
              </Picker>
            </View>
          )}
          
          {/* Branch access info */}
          <View style={styles.accessInfoContainer}>
            <MaterialCommunityIcons 
              name={canAccessAllBranches ? 'key' : userRole === 'Franchisee' ? 'key-variant' : 'lock'} 
              size={12} 
              color={canAccessAllBranches ? Colors.success : userRole === 'Franchisee' ? Colors.warning : Colors.textSecondary} 
            />
            <Text style={styles.accessInfoText}>
              {canAccessAllBranches ? 'Full Access - All Branches' : 
               userRole === 'Franchisee' ? 'Franchisee Access - Your Branches' : 
               'Limited Access - Your Branch Only'}
            </Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or ID..."
          style={styles.modernSearch}
          placeholderTextColor={Colors.textSecondary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
            <MaterialCommunityIcons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary */}
      <LinearGradient
        colors={Colors.gradientPrimary}
        style={[Theme.components.card.elevated, styles.summaryCard]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {['total', 'present', 'absent', 'unmarked'].map(k => (
          <TouchableOpacity 
            key={k} 
            style={[styles.sumItem, statusFilter === k && styles.sumItemActive]} 
            onPress={() => handleStatusFilter(k)}
            activeOpacity={0.7}
          >
            <Text style={[Theme.typography.caption, styles.sumLabel]}>{k}</Text>
            <Text style={[Theme.typography.h6, styles.sumVal]}>{summary[k]}</Text>
            {statusFilter === k && (
              <MaterialCommunityIcons 
                name="check-circle" 
                size={16} 
                color={Colors.textOnPrimary} 
                style={styles.activeIcon}
              />
            )}
          </TouchableOpacity>
        ))}
      </LinearGradient>
    </View>
  );

  const fetchUserDetailData = async (user, month) => {
    setDetailLoading(true);
    try {
      const apiUrl = `/api/attendance/get_user_monthly_detail.php?user_id=${user.id}&user_type=${user.type}&year=${month.getFullYear()}&month=${month.getMonth() + 1}`;
      console.log('📡 Fetching user detail from:', apiUrl);
      
      const response = await authFetch(apiUrl);
      console.log('✅ User detail response status:', response.status);
      
      // Parse JSON from response
      const responseData = await response.json();
      console.log('📋 Parsed response data:', responseData);
      console.log('📋 Response structure check:');
      console.log('  - responseData.data:', responseData.data);
      console.log('  - user_info:', responseData.data?.user_info);
      console.log('  - summary:', responseData.data?.summary);
      console.log('  - attendance_details:', responseData.data?.attendance_details);
      
      if (responseData && responseData.success !== false) {
        // The API returns the data wrapped in a 'data' property
        const actualData = responseData.data || responseData;
        setUserDetailData(actualData);
        console.log('📋 User detail data set successfully:', actualData);
      } else {
        console.error('❌ API returned error:', responseData);
        Alert.alert('Error', responseData.message || 'Failed to load user attendance details');
      }
    } catch (error) {
      console.error('❌ Error fetching user detail:', error);
      Alert.alert('Error', 'Failed to load user attendance details: ' + error.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUserClick = async (user) => {
    console.log('🔍 Clicked user:', user);
    console.log('🔍 User type:', user.type);
    console.log('🔍 User ID:', user.id);
    setSelectedUserDetail(user);
    setDetailModalVisible(true);
    await fetchUserDetailData(user, detailSelectedMonth);
  };

  const handleDetailMonthChange = async (newMonth) => {
    setDetailSelectedMonth(newMonth);
    if (selectedUserDetail) {
      await fetchUserDetailData(selectedUserDetail, newMonth);
    }
  };

  const renderMonthlyItem = ({ item, index }) => (
    <TouchableOpacity onPress={() => handleUserClick(item)}>
      <Animatable.View animation="fadeInUp" delay={index * 40} style={[styles.monthlyCard]}>
        <LinearGradient 
          colors={item.type === 'student' ? ['#E8F5E8', '#FFFFFF'] : ['#FFF3E0', '#FFFFFF']} 
          style={styles.monthlyCardGradient}
        >
        <View style={styles.monthlyCardHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={getAvatarSource(item)}
              style={styles.modernAvatar}
              defaultSource={require('../../assets/Avartar.png')}
              onError={(e) => console.log('Avatar load error for item:', item.name, e)}
            />
            <View style={[styles.typeIndicator, item.type === 'student' ? styles.studentIndicator : styles.staffIndicator]}>
              <MaterialCommunityIcons 
                name={item.type === 'student' ? 'school' : 'account-tie'} 
                size={12} 
                color={Colors.white} 
              />
            </View>
          </View>
          
          <View style={styles.monthlyCardInfo}>
            <Text style={styles.monthlyCardName}>{item.name || 'Unknown'}</Text>
            <Text style={styles.monthlyCardId}>
              {item.type === 'student' ? `Student ID: ${item.code || item.id || 'N/A'}` : `Staff ID: ${item.employee_id || item.id || 'N/A'}`}
            </Text>
            {item.branch_name && (
              <View style={styles.branchContainer}>
                <MaterialCommunityIcons name="map-marker" size={12} color={Colors.textSecondary} />
                <Text style={styles.modernBranchTxt}>{item.branch_name}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.monthlyStatsContainer}>
            <View style={styles.monthlyStatItem}>
              <Text style={styles.monthlyStatLabel}>Present</Text>
              <Text style={[styles.monthlyStatValue, { color: Colors.success }]}>{item.present_days || 0}</Text>
            </View>
            <View style={styles.monthlyStatItem}>
              <Text style={styles.monthlyStatLabel}>Absent</Text>
              <Text style={[styles.monthlyStatValue, { color: Colors.danger }]}>{item.absent_days || 0}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animatable.View>
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" delay={index * 40} style={[styles.modernCard]}>
      <LinearGradient 
        colors={item.type === 'student' ? ['#E3F2FD', '#FFFFFF'] : ['#F3E5F5', '#FFFFFF']} 
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={getAvatarSource(item)}
              style={styles.modernAvatar}
              defaultSource={require('../../assets/Avartar.png')}
              onError={(e) => console.log('Avatar load error for item:', item.name, e)}
            />
            <View style={[styles.typeIndicator, item.type === 'student' ? styles.studentIndicator : styles.staffIndicator]}>
              <MaterialCommunityIcons 
                name={item.type === 'student' ? 'school' : 'account-tie'} 
                size={12} 
                color={Colors.white} 
              />
            </View>
          </View>
          
          <View style={styles.cardInfo}>
            <Text style={styles.modernCardName}>{item.name || 'Unknown'}</Text>
            {item.type === 'student' && (
              <Text style={styles.modernCardId}>Student ID: {item.code || item.id || 'N/A'}</Text>
            )}
            {item.type === 'staff' && (
              <Text style={styles.modernCardId}>Staff ID: {item.employee_id || item.id || 'N/A'}</Text>
            )}
            {item.branch_name && (
              <View style={styles.branchContainer}>
                <MaterialCommunityIcons name="map-marker" size={12} color={Colors.textSecondary} />
                <Text style={styles.modernBranchTxt}>{item.branch_name}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.modernStatus, styles[`modernStatus_${item.status}`]]}>
              <MaterialCommunityIcons 
                name={
                  item.status === 'present' ? 'check-circle' : 
                  item.status === 'absent' ? 'close-circle' : 
                  'help-circle'
                } 
                size={16} 
                color={Colors.white} 
              />
              <Text style={styles.modernStatusText}>{item.status || 'unmarked'}</Text>
            </View>
          </View>
        </View>
        
        {/* Time and Guardian Info */}
        <View style={styles.cardDetails}>
          <View style={styles.timeSection}>
            {item.in_time && (
              <View style={styles.timeItem}>
                <MaterialCommunityIcons name="login" size={14} color={Colors.success} />
                <Text style={styles.modernTimeTxt}>In: {item.in_time.slice(0, 5)}</Text>
              </View>
            )}
            {item.out_time && (
              <View style={styles.timeItem}>
                <MaterialCommunityIcons name="logout" size={14} color={Colors.danger} />
                <Text style={styles.modernTimeTxt}>Out: {item.out_time.slice(0, 5)}</Text>
              </View>
            )}
          </View>
          
          {/* Guardian Info for Students */}
          {item.type === 'student' && (item.in_guardian_type || item.out_guardian_type) && (
            <View style={styles.guardianSection}>
              {item.in_guardian_type && (
                <View style={styles.guardianItem}>
                  <View style={styles.guardianInfoContainer}>
                    <View style={[styles.guardianCircle, getGuardianPhoto(item, item.in_guardian_type) && styles.guardianCirclePhoto]}>
                      {getGuardianPhoto(item, item.in_guardian_type) ? (
                        <Image
                          source={getGuardianPhoto(item, item.in_guardian_type)}
                          style={styles.guardianPhoto}
                          defaultSource={require('../../assets/Avartar.png')}
                          onError={(e) => console.log('Guardian photo load error:', e)}
                          onLoad={() => console.log('Guardian photo loaded successfully')}
                        />
                      ) : (
                        <MaterialCommunityIcons 
                          name={item.in_guardian_type === 'Father' ? 'account-tie' : 
                                item.in_guardian_type === 'Mother' ? 'account-heart' : 
                                'account-supervisor'} 
                          size={16} 
                          color={Colors.white} 
                        />
                      )}
                    </View>
                    <View style={styles.guardianTextContainer}>
                      <Text style={styles.modernGuardianTxt}>
                        Drop: {item.in_guardian_name ? (
                          <>
                            {item.in_guardian_name}
                            <Text style={styles.guardianTypeText}> ({item.in_guardian_type || 'Guardian'})</Text>
                          </>
                        ) : (
                          <Text style={styles.guardianTypeText}>{item.in_guardian_type || 'Unknown'}</Text>
                        )}
                      </Text>
                      {item.in_time && (
                        <Text style={styles.guardianTimeTxt}>
                          at {item.in_time.slice(0, 5)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
              {item.out_guardian_type && (
                <View style={styles.guardianItem}>
                  <View style={styles.guardianInfoContainer}>
                    <View style={[styles.guardianCircle, getGuardianPhoto(item, item.out_guardian_type) && styles.guardianCirclePhoto]}>
                      {getGuardianPhoto(item, item.out_guardian_type) ? (
                        <Image
                          source={getGuardianPhoto(item, item.out_guardian_type)}
                          style={styles.guardianPhoto}
                          defaultSource={require('../../assets/Avartar.png')}
                          onError={(e) => console.log('Guardian photo load error:', e)}
                          onLoad={() => console.log('Guardian photo loaded successfully')}
                        />
                      ) : (
                        <MaterialCommunityIcons 
                          name={item.out_guardian_type === 'Father' ? 'account-tie' : 
                                item.out_guardian_type === 'Mother' ? 'account-heart' : 
                                'account-supervisor'} 
                          size={16} 
                          color={Colors.white} 
                        />
                      )}
                    </View>
                    <View style={styles.guardianTextContainer}>
                      <Text style={styles.modernGuardianTxt}>
                        Pick: {item.out_guardian_name ? (
                          <>
                            {item.out_guardian_name}
                            <Text style={styles.guardianTypeText}> ({item.out_guardian_type || 'Guardian'})</Text>
                          </>
                        ) : (
                          <Text style={styles.guardianTypeText}>{item.out_guardian_type || 'Unknown'}</Text>
                        )}
                      </Text>
                      {item.out_time && (
                        <Text style={styles.guardianTimeTxt}>
                          at {item.out_time.slice(0, 5)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
          
          {/* Staff Notes */}
          {item.type === 'staff' && item.note && (
            <View style={styles.noteSection}>
              <MaterialCommunityIcons name="note-text" size={12} color={Colors.textSecondary} />
              <Text style={styles.modernNoteTxt} numberOfLines={2}>{item.note}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  /* -------------------------------- Return -------------------------------- */
  return (
    <SafeAreaView style={[Theme.components.container.light, styles.container]}>
      {renderHeader()}
      {loading ? (
        <View style={[Theme.components.container.medium, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={viewMode === 'monthly' ? renderMonthlyItem : renderItem}
          keyExtractor={(it, idx) => `${it.id}-${idx}`}
          contentContainerStyle={[Theme.components.container.light, { paddingBottom: 120 }]}
          ListEmptyComponent={
            <View style={[Theme.components.container.medium, styles.emptyContainer]}>
              <Text style={[Theme.typography.body2, { textAlign: 'center' }]}>
                {viewMode === 'monthly' ? 'No monthly records found' : 'No records'}
              </Text>
            </View>
          }
        />
      )}
      {showDatePicker && (
        <DateTimePicker 
          value={viewMode === 'daily' ? date : selectedMonth} 
          mode={viewMode === 'daily' ? 'date' : 'date'} 
          display="default" 
          onChange={(e, d) => { 
            setShowDatePicker(false); 
            if (d) {
              if (viewMode === 'daily') {
                setDate(d);
              } else {
                setSelectedMonth(d);
              }
            }
          }} 
        />
      )}
      
      {/* User Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setDetailModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <MaterialCommunityIcons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedUserDetail?.name} - Monthly Details
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          
          {/* Month Picker for Detail Modal */}
          <View style={styles.detailMonthPicker}>
            <TouchableOpacity 
              onPress={() => handleDetailMonthChange(new Date(detailSelectedMonth.getFullYear(), detailSelectedMonth.getMonth() - 1, 1))}
              style={styles.monthNavButton}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.primary} />
            </TouchableOpacity>
            
            <Text style={styles.detailMonthText}>
              {detailSelectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            
            <TouchableOpacity 
              onPress={() => handleDetailMonthChange(new Date(detailSelectedMonth.getFullYear(), detailSelectedMonth.getMonth() + 1, 1))}
              style={styles.monthNavButton}
            >
              <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          {detailLoading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading details...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalContent}>
              {userDetailData && (
                <>
                  {/* User Info Card */}
                  <View style={styles.userInfoCard}>
                    <Image 
                      source={
                        (userDetailData.user_info?.avatar_url || selectedUserDetail?.avatar_url) 
                          ? { uri: userDetailData.user_info?.avatar_url || selectedUserDetail?.avatar_url }
                          : require('../../assets/Avartar.png')
                      }
                      style={styles.userAvatar}
                      onError={() => {
                        // If network image fails to load, this will automatically fall back to the default
                        console.log('Profile image failed to load, using default avatar');
                      }}
                    />
                    <View style={styles.userInfoText}>
                      <Text style={styles.userName}>{userDetailData.user_info?.name || selectedUserDetail?.name || 'Unknown'}</Text>
                      <Text style={styles.userCode}>{userDetailData.user_info?.code || selectedUserDetail?.code || 'N/A'}</Text>
                      <Text style={styles.userBranch}>{userDetailData.user_info?.branch_name || selectedUserDetail?.branch_name || 'N/A'}</Text>
                    </View>
                  </View>
                  
                  {/* Summary Cards */}
                  <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { backgroundColor: '#e8f5e8' }]}>
                      <Text style={styles.summaryNumber}>{userDetailData.summary?.present_days || 0}</Text>
                      <Text style={styles.summaryLabel}>Present</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: '#ffe8e8' }]}>
                      <Text style={styles.summaryNumber}>{userDetailData.summary?.absent_days || 0}</Text>
                      <Text style={styles.summaryLabel}>Absent</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: '#fff3e0' }]}>
                      <Text style={styles.summaryNumber}>{userDetailData.summary?.unmarked_days || 0}</Text>
                      <Text style={styles.summaryLabel}>Unmarked</Text>
                    </View>
                  </View>
                  
                  {/* Attendance Details */}
                  <Text style={styles.sectionTitle}>Daily Attendance</Text>
                  {userDetailData.attendance_details && userDetailData.attendance_details.length > 0 ? (
                    userDetailData.attendance_details.map((day, index) => (
                    <View key={index} style={styles.dayCard}>
                      <View style={styles.dayHeader}>
                        <Text style={styles.dayDate}>{new Date(day.date).getDate()}</Text>
                        <View style={styles.dayInfo}>
                          <Text style={styles.dayName}>{day.day_name}</Text>
                          <Text style={styles.dayFullDate}>{new Date(day.date).toLocaleDateString()}</Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: day.status === 'present' ? '#4CAF50' : day.status === 'absent' ? '#F44336' : '#FF9800' }
                        ]}>
                          <Text style={styles.statusText}>{day.status.toUpperCase()}</Text>
                        </View>
                      </View>
                      
                      {(day.status === 'present' || selectedUserDetail?.type === 'staff') && (
                        <View style={styles.dayDetails}>
                          {(day.in_time || day.out_time) && (
                            <View style={styles.timeRow}>
                              <MaterialCommunityIcons name="clock-in" size={16} color={Colors.success} />
                              <Text style={styles.timeText}>In: {day.in_time || 'N/A'}</Text>
                              <MaterialCommunityIcons name="clock-out" size={16} color={Colors.danger} />
                              <Text style={styles.timeText}>Out: {day.out_time || 'N/A'}</Text>
                            </View>
                          )}
                          {day.total_hours && selectedUserDetail?.type === 'staff' && (
                            <Text style={styles.hoursText}>Total Hours: {day.total_hours}h</Text>
                          )}
                          {day.guardian_type && selectedUserDetail?.type === 'student' && (
                            <Text style={styles.guardianText}>Guardian: {day.guardian_type}</Text>
                          )}
                          {day.remarks && (
                            <View style={styles.remarksContainer}>
                              <MaterialCommunityIcons name="note-text" size={16} color={Colors.textSecondary} />
                              <Text style={styles.remarksText}>Notes: {day.remarks}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  ))
                  ) : (
                    <View style={styles.noDataContainer}>
                      <MaterialCommunityIcons name="calendar-blank" size={48} color={Colors.textSecondary} />
                      <Text style={styles.noDataText}>No attendance records found for this month</Text>
                      <Text style={styles.noDataSubText}>
                        {selectedUserDetail?.type === 'staff' ? 'Staff attendance' : 'Student attendance'} data will appear here once marked.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Theme.spacing.md, marginTop: Theme.spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Theme.spacing.sm },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Theme.spacing.xxl },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.containerLight },
  downloadText: { marginLeft: 6, fontSize: 14, fontWeight: '600' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.sm },
  dateTxt: { marginLeft: Theme.spacing.sm, color: Colors.white, fontWeight: '600' },
  typeBar: { flexDirection: 'row' },
  typeChip: { paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.sm, borderRadius: Theme.borderRadius.full, backgroundColor: Colors.containerDark, marginHorizontal: 2 },
  typeChipActive: { backgroundColor: Colors.primary },
  typeChipTxt: { color: Colors.textSecondary, fontWeight: '500' },
  typeChipTxtActive: { color: Colors.textOnPrimary, fontWeight: '600' },
  pickerWrap: { marginTop: Theme.spacing.md },
  
  // Modern Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: Theme.spacing.md,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  modernSearch: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  clearButton: {
    padding: 4,
  },
  
  summaryCard: { marginTop: Theme.spacing.md, flexDirection: 'row', padding: 16, borderRadius: 12 },
  sumItem: { alignItems: 'center', flex: 1, padding: 8, borderRadius: 8 },
  sumItemActive: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  sumLabel: { color: Colors.textOnPrimary, fontSize: 10, textTransform: 'uppercase', fontWeight: '500' },
  sumVal: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  activeIcon: { marginTop: 4 },
  
  // Modern Card Styles
  modernCard: {
    marginTop: Theme.spacing.md,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  modernAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.containerDark,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  typeIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  studentIndicator: {
    backgroundColor: Colors.primary,
  },
  staffIndicator: {
    backgroundColor: Colors.accent,
  },
  cardInfo: {
    flex: 1,
  },
  modernCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  modernCardId: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  branchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernBranchTxt: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  modernStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
  },
  modernStatus_present: {
    backgroundColor: Colors.success,
  },
  modernStatus_absent: {
    backgroundColor: Colors.danger,
  },
  modernStatus_unmarked: {
    backgroundColor: Colors.textSecondary,
  },
  modernStatusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  
  // Card Details Styles
  cardDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  modernTimeTxt: {
    fontSize: 12,
    color: Colors.text,
    marginLeft: 4,
    fontWeight: '500',
  },
  guardianSection: {
    marginBottom: 8,
  },
  guardianItem: {
    marginBottom: 6,
  },
  guardianInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guardianTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  guardianCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  guardianCirclePhoto: {
    backgroundColor: 'transparent',
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  guardianPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  modernGuardianTxt: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  guardianTypeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  guardianTimeTxt: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modernNoteTxt: {
    fontSize: 11,
    color: Colors.text,
    marginLeft: 4,
    fontStyle: 'italic',
    flex: 1,
  },
  
  loadingContainer: { marginTop: Theme.spacing.xl, alignItems: 'center', justifyContent: 'center', padding: Theme.spacing.xl },
  emptyContainer: { marginTop: Theme.spacing.xl, padding: Theme.spacing.xl },
  
  // Enhanced Header Styles
  enhancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
    marginBottom: 4,
  },
  roleChip_admin: {
    backgroundColor: Colors.success,
  },
  roleChip_franchisee: {
    backgroundColor: Colors.warning,
  },
  roleChip_teacher: {
    backgroundColor: Colors.primary,
  },
  roleChip_tuition_teacher: {
    backgroundColor: Colors.accent,
  },
  roleText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  downloadBtnDisabled: {
    opacity: 0.5,
  },
  
  // Branch Selection Styles
  branchSelectionContainer: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  singleBranchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  singleBranchText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  teacherBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  teacherBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  enhancedPickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  pickerIcon: {
    marginRight: 8,
  },
  enhancedPicker: {
    flex: 1,
    height: 50,
  },
  accessInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  accessInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  
  // View Mode Toggle Styles
  viewModeContainer: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.containerLight,
    borderRadius: 12,
    padding: 4,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewModeBtnActive: {
    backgroundColor: Colors.primary,
  },
  viewModeTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  viewModeTxtActive: {
    color: Colors.textOnPrimary,
  },
  
  // Monthly View Styles
  monthlyCard: {
    marginTop: Theme.spacing.md,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  monthlyCardGradient: {
    borderRadius: 16,
    padding: 16,
  },
  monthlyCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  monthlyCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  monthlyCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  monthlyCardId: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  monthlyStatsContainer: {
    alignItems: 'flex-end',
  },
  monthlyStatItem: {
    alignItems: 'center',
    marginBottom: 8,
    minWidth: 60,
  },
  monthlyStatLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 2,
  },
  monthlyStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthlyDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  
  // Pickup/Drop Section Styles
  pickupDropSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  pickupDropItem: {
    backgroundColor: Colors.containerLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pickupDropDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  pickupDropInfo: {
    marginLeft: 8,
  },
  guardianDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  guardianDetailText: {
    fontSize: 12,
    color: Colors.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  
  // Teacher Attendance Section Styles
  teacherAttendanceSection: {
    marginBottom: 16,
  },
  teacherAttendanceItem: {
    backgroundColor: Colors.containerLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  teacherAttendanceDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  teacherTimeInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  timeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  timeDetailText: {
    fontSize: 12,
    color: Colors.text,
    marginLeft: 4,
    fontWeight: '500',
  },
  monthlyStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  monthlyStatus_present: {
    backgroundColor: Colors.success,
  },
  monthlyStatus_absent: {
    backgroundColor: Colors.danger,
  },
  monthlyStatus_partial: {
    backgroundColor: Colors.warning,
  },
  monthlyStatusText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.containerLight,
  },
  modalCloseBtn: {
    padding: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  detailMonthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.containerLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  monthNavButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  detailMonthText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    flex: 1,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.containerLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  userInfoText: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  userCode: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userBranch: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  dayCard: {
    backgroundColor: Colors.containerLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayDate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    width: 40,
  },
  dayInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dayFullDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  dayDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 16,
  },
  hoursText: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 8,
    fontWeight: '500',
  },
  guardianText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  remarksContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    gap: 8,
  },
  remarksText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    fontStyle: 'italic',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  noDataSubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default UnifiedAttendanceScreen;