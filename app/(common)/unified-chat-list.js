import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useRouter } from 'expo-router';
import authFetch from '../utils/api';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WhiteBackground from '../components/WhiteBackground';

export default function UnifiedChatList() {
  const router = useRouter();
  const Colors = useColors();
  const { isDarkMode } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    loadData();
    
    // Set up real-time updates (polling every 5 seconds)
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        // Reload users after setting current user to apply filtering
        setTimeout(() => loadUsers(), 100);
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        loadConversations(),
        loadUsers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadConversations = async () => {
    try {
      const response = await authFetch('/api/chat/unified_chat.php?action=conversations');
      const result = await response.json();
      
      if (result.success) {
        setConversations(result.data || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await authFetch('/api/chat/unified_chat.php?action=users');
      const result = await response.json();
      
      if (result.success) {
        let filteredUsers = result.data || [];
        
        // Filter users based on current user's role
        if (currentUser) {
          const userRole = currentUser.role;
          
          if (userRole === 'Student') {
            // Students can ONLY see: Admin, Franchisee, and Teacher (no other roles)
            filteredUsers = filteredUsers.filter(user => 
              (user.role === 'Admin' || user.role === 'Franchisee' || user.role === 'Teacher') && 
              user.role !== 'Student'
            );
          } else if (userRole === 'Admin') {
            // Admins can ONLY see: Franchisee and Teacher (no students or other roles)
            filteredUsers = filteredUsers.filter(user => 
              user.role === 'Franchisee' || user.role === 'Teacher'
            );
          } else if (userRole === 'Teacher') {
            // Teachers can see: Students, Franchisee, and Admin (no other teachers)
            filteredUsers = filteredUsers.filter(user => 
              (user.role === 'Student' || user.role === 'Franchisee' || user.role === 'Admin') && 
              user.role !== 'Teacher'
            );
          } else if (userRole === 'Franchisee') {
            // Franchisees can see: Teacher, Admin, Students (excluding other Franchisees)
            filteredUsers = filteredUsers.filter(user => 
              (user.role === 'Teacher' || user.role === 'Admin' || user.role === 'Student') && 
              user.role !== 'Franchisee'
            );
          }
          // Other roles can see everyone (no special filtering)
        }
        
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleChatPress = (partner) => {
    router.push({
      pathname: '/(common)/unified-chat-detail',
      params: {
        partnerId: partner.id || partner.partner_id,
        partnerName: partner.name || partner.partner_name || 'User',
        partnerAvatar: partner.avatar || partner.partner_avatar || '',
        partnerRole: partner.role || partner.partner_role || ''
      }
    });
  };

  const handleCallPress = (phoneNumber) => {
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'This user does not have a phone number');
      return;
    }
    
    // Clean phone number - remove spaces and special characters
    const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
    const phoneUrl = `tel:${cleanNumber}`;
    
    Linking.canOpenURL(phoneUrl).then(supported => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Unable to make phone call');
      }
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return ['#4ECDC4', '#44A08D'];
      case 'Franchisee': return ['#A8E6CF', '#88D8A3'];
      case 'Teacher': return ['#FFD93D', '#6BCF7F'];
      case 'Student': return ['#FF6B6B', '#FF8E53'];
      default: return ['#E0E0E0', '#BDBDBD'];
    }
  };

  const getDisplayRole = (role) => {
    switch (role) {
      case 'Franchisee': return 'School';
      default: return role;
    }
  };

  const renderConversationItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={600} delay={index * 50}>
      <TouchableOpacity 
        style={[styles.conversationItem, { backgroundColor: Colors.surface }]}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={
              item.partner_avatar && item.partner_avatar.trim() !== '' 
                ? { uri: item.partner_avatar.startsWith('http') ? item.partner_avatar : `https://your-domain.com${item.partner_avatar}` }
                : require('../../assets/Avartar.png')
            } 
            style={styles.avatar}
          />
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.partnerName, { color: Colors.text }]} numberOfLines={1}>
              {item.partner_name}
            </Text>
            <Text style={[styles.timestamp, { color: Colors.textSecondary }]}>
              {formatTime(item.last_message_time)}
            </Text>
          </View>
          
          <View style={styles.conversationSubheader}>
            <LinearGradient
              colors={getRoleColor(item.partner_role)}
              style={styles.roleTag}
            >
              <Text style={styles.roleText}>{getDisplayRole(item.partner_role)}</Text>
            </LinearGradient>
            {item.partner_branch && (
              <Text style={[styles.branchText, { color: Colors.textSecondary }]} numberOfLines={1}>
                {item.partner_branch}
              </Text>
            )}
          </View>
          
          <Text style={[styles.lastMessage, { color: Colors.textSecondary }]} numberOfLines={2}>
            {item.last_message || 'No messages yet'}
          </Text>
        </View>
        
        <View style={styles.conversationActions}>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderUserItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={600} delay={index * 50}>
      <TouchableOpacity 
        style={[styles.userItem, { backgroundColor: Colors.surface }]}
        onPress={() => handleChatPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={
              item.avatar && item.avatar.trim() !== '' 
                ? { uri: item.avatar.startsWith('http') ? item.avatar : `https://your-domain.com${item.avatar}` }
                : require('../../assets/Avartar.png')
            } 
            style={styles.avatar}
          />
        </View>
        
        <View style={styles.userContent}>
          <View style={styles.userHeader}>
            <Text style={[styles.userName, { color: Colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <LinearGradient
              colors={getRoleColor(item.role)}
              style={styles.roleTag}
            >
              <Text style={styles.roleText}>{getDisplayRole(item.role)}</Text>
            </LinearGradient>
          </View>
          
          {item.branch_name && (
            <Text style={[styles.branchText, { color: Colors.textSecondary }]} numberOfLines={1}>
              {item.branch_name}
            </Text>
          )}
        </View>
        
        <View style={styles.userActions}>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => handleCallPress(item.phone)}
          >
            <Ionicons name="call" size={20} color={Colors.success} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatButton}>
            <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderTabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: Colors.surface }]}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'chats' && [styles.activeTab, { backgroundColor: Colors.primary }]]}
        onPress={() => setActiveTab('chats')}
        activeOpacity={0.8}
      >
        <MaterialIcons 
          name="chat" 
          size={20} 
          color={activeTab === 'chats' ? Colors.textOnPrimary : Colors.textSecondary} 
        />
        <Text style={[styles.tabText, { color: Colors.textSecondary }, activeTab === 'chats' && [styles.activeTabText, { color: Colors.textOnPrimary }]]}>
          Chats
        </Text>
        {conversations.length > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: Colors.danger }]}>
            <Text style={[styles.tabBadgeText, { color: Colors.white }]}>{conversations.length}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'users' && [styles.activeTab, { backgroundColor: Colors.primary }]]}
        onPress={() => setActiveTab('users')}
        activeOpacity={0.8}
      >
        <MaterialIcons 
          name="people" 
          size={20} 
          color={activeTab === 'users' ? Colors.textOnPrimary : Colors.textSecondary} 
        />
        <Text style={[styles.tabText, { color: Colors.textSecondary }, activeTab === 'users' && [styles.activeTabText, { color: Colors.textOnPrimary }]]}>
          Users
        </Text>
        {users.length > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: Colors.danger }]}>
            <Text style={[styles.tabBadgeText, { color: Colors.white }]}>{users.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: Colors.background }]}>
        <MaterialIcons 
          name={activeTab === 'chats' ? 'chat-bubble-outline' : 'people-outline'} 
          size={48} 
          color={Colors.textSecondary} 
        />
      </View>
      <Text style={[styles.emptyText, { color: Colors.text }]}>
        {activeTab === 'chats' ? 'No conversations yet' : 'No users available'}
      </Text>
      <Text style={[styles.emptySubtext, { color: Colors.textSecondary }]}>
        {activeTab === 'chats' 
          ? 'Start a conversation with someone from the Users tab' 
          : 'No other users found in your network'
        }
      </Text>
    </View>
  );

  return (
    <WhiteBackground>
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
        {/* Modern Header */}
        <Animatable.View animation="fadeInDown" duration={600} delay={100}>
          <View style={[styles.header, { backgroundColor: Colors.background }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={[styles.headerIconContainer, { backgroundColor: Colors.primary }]}>
                  <MaterialIcons name="chat" size={24} color={Colors.textOnPrimary} />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={[styles.headerTitle, { color: Colors.text }]}>Messages</Text>
                  <Text style={[styles.headerSubtitle, { color: Colors.textSecondary }]}>
                    {currentUser?.name || 'User'} • {currentUser?.role || 'Role'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.searchButton, { backgroundColor: Colors.surface }]}>
                <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </Animatable.View>
        
        {/* Modern Tab Bar */}
        <Animatable.View animation="fadeInUp" duration={600} delay={200}>
          {renderTabBar()}
        </Animatable.View>
        
        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, { color: Colors.textSecondary }]}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            data={activeTab === 'chats' ? conversations : users}
            renderItem={activeTab === 'chats' ? renderConversationItem : renderUserItem}
            keyExtractor={(item) => item.partner_id?.toString() || item.id.toString()}
            contentContainerStyle={[
              styles.listContainer,
              (activeTab === 'chats' ? conversations : users).length === 0 && styles.emptyListContainer,
              { paddingBottom: 100 }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={renderEmptyState}
            style={styles.flatList}
          />
        )}
      </SafeAreaView>
    </WhiteBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Modern Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modern Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    position: 'relative',
  },
  activeTab: {
    // backgroundColor set dynamically
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
  },
  activeTabText: {
    // color set dynamically
  },
  tabBadge: {
    position: 'absolute',
    top: 6,
    right: 12,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
    paddingTop: 10, // Reduce top padding to give more space for content
  },
  flatList: {
    flex: 1,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  // Chat Items
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4757',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
  },
  userContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
  conversationSubheader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  branchText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  lastMessage: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  conversationActions: {
    marginLeft: 10,
  },
  userActions: {
    marginLeft: 10,
  },
  moreButton: {
    padding: 5,
  },
  callButton: {
    padding: 5,
    marginRight: 10,
  },
  chatButton: {
    padding: 5,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
});
