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
  const [statusFilter, setStatusFilter] = useState('all'); // New filter state

  /* ----------------------------- Load User Data --------------------------- */
  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role);
        setUserBranch(user.branch_id);
        
        // If teacher, automatically set their branch and type to student
        if (user.role === 'Teacher' || user.role === 'Tuition Teacher') {
          setBranch(user.branch_id);
          setType('student');
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
        const mapped = json.data.map(b => ({ label: b.name ?? b.branch_name, value: b.id ?? b.branch_id }));
        
        // Only add "All" option for Admin or branch_id=1 users
        if (userRole === 'Admin' || userBranch == 1) {
          setBranches([{ label: 'All', value: 'All' }, ...mapped]);
        } else {
          // For franchisees and other users, show only their branches
          setBranches(mapped);
          // Auto-select the first branch if only one available
          if (mapped.length === 1) {
            setBranch(mapped[0].value);
          }
        }
      }
    } catch (err) {
      console.log('Branch fetch error:', err);
    }
  }, [userRole, userBranch]);

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
  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  /* ----------------------------- Filter Function -------------------------- */
  const applyFilters = useCallback(() => {
    let filteredData = records;
    
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

  /* ----------------------------- PDF Download Handler -------------------- */
  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const d = date.toISOString().split('T')[0];
      let url = `/api/attendance/download_attendance_pdf.php?date=${d}`;
      if (type !== 'all') url += `&type=${type}`;
      if (branch !== 'All') url += `&branch_id=${branch}`;
      
      const response = await authFetch(url);
      const result = await response.json();
      
      if (result.success && result.pdf_url) {
        // Open PDF in browser or download
        const pdfUrl = `${API_URL}${result.pdf_url}`;
        console.log('📄 Opening PDF:', pdfUrl);
        // You can use Linking.openURL(pdfUrl) or implement file download
        alert(`PDF generated successfully! URL: ${pdfUrl}`);
      } else {
        alert('Failed to generate PDF: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setLoading(false);
    }
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
      {/* Report title with download button */}
      <View style={styles.titleRow}>
        <Text style={[Theme.typography.h5, styles.title]}>Attendance Report</Text>
        <TouchableOpacity 
          style={styles.downloadBtn} 
          onPress={handleDownloadPDF}
          disabled={loading}
        >
          <MaterialCommunityIcons 
            name="download" 
            size={20} 
            color={loading ? Colors.textSecondary : Colors.primary} 
          />
          <Text style={[styles.downloadText, { color: loading ? Colors.textSecondary : Colors.primary }]}>
            {loading ? 'Generating...' : 'PDF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date + Type row */}
      <View style={styles.rowBetween}>
        <TouchableOpacity style={[Theme.components.button.primary, styles.dateBtn]} onPress={() => setShowDatePicker(true)}>
          <MaterialCommunityIcons name="calendar" size={18} color={Colors.textOnPrimary} />
          <Text style={[Theme.typography.button, styles.dateTxt]}>{date.toISOString().split('T')[0]}</Text>
        </TouchableOpacity>
        <View style={styles.typeBar}>
          {(userRole === 'Admin' || userRole === 'Franchisee' ? ['all', 'student', 'staff'] : ['student']).map(t => (
            <TouchableOpacity key={t} style={[styles.typeChip, type === t && styles.typeChipActive]} onPress={() => setType(t)}>
              <Text style={[styles.typeChipTxt, type === t && styles.typeChipTxtActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Branch picker - hide for teachers as they can only see their branch */}
      {branches.length > 1 && userRole !== 'Teacher' && userRole !== 'Tuition Teacher' && (
        <View style={[Theme.components.container.medium, styles.pickerWrap]}>
          <Picker selectedValue={branch} onValueChange={v => setBranch(v)}>
            {branches.map(b => (<Picker.Item key={b.value} label={b.label} value={b.value} />))}
          </Picker>
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
          renderItem={renderItem}
          keyExtractor={(it, idx) => `${it.id}-${idx}`}
          contentContainerStyle={[Theme.components.container.light, { paddingBottom: 120 }]}
          ListEmptyComponent={
            <View style={[Theme.components.container.medium, styles.emptyContainer]}>
              <Text style={[Theme.typography.body2, { textAlign: 'center' }]}>No records</Text>
            </View>
          }
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
  container: { flex: 1, paddingHorizontal: Theme.spacing.md },
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
});

export default UnifiedAttendanceScreen;