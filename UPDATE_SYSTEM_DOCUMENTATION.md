# 🚀 App Update System Documentation

## Overview
A comprehensive auto-update system has been implemented for the TN Happy Kids Playschool app, allowing users to check for updates and install new versions seamlessly.

## 🎯 Features Implemented

### ✅ Core Components
1. **UpdateService** - Centralized update management service
2. **UpdateModal** - Modern UI for update notifications and installation
3. **Backend API** - Server-side version checking and configuration
4. **Settings Integration** - "Check Update" button in all user role settings
5. **Auto-Update** - Automatic background checking every 6 hours

### ✅ User Experience
- **Modern UI Design** with gradients and animations
- **Role-based Access** - Available to all user types
- **Manual Check** - Users can manually check for updates
- **Auto-Install** - One-click update installation
- **Progress Feedback** - Loading states and installation progress
- **Force Update** - Critical updates can be made mandatory

## 📱 How It Works

### 1. Version Checking
```javascript
// Manual check triggered by user
const updateInfo = await UpdateService.manualUpdateCheck();

// Automatic background checking
UpdateService.startAutoUpdateCheck(); // Every 6 hours
```

### 2. Update Flow
1. User clicks "Check Update" in Settings
2. App queries backend API for latest version
3. If update available, shows modern update modal
4. User can choose to install or skip (unless force update)
5. Installation redirects to download URL
6. User installs new version manually

### 3. Backend Configuration
```php
// Current configuration in check_update.php
$app_config = [
    'latest_version' => '1.1.0',
    'download_url' => 'https://appv5.tnhappykids.in/downloads/tn-happykids-v1.1.0.apk',
    'release_notes' => 'Bug fixes and improvements...',
    'force_update' => false
];
```

## 🔧 Technical Implementation

### Files Created/Modified

#### New Files:
- `app/services/UpdateService.js` - Core update service
- `app/components/UpdateModal.js` - Update UI component
- `lastchapter/api/app/check_update.php` - Backend API

#### Modified Files:
- `app/(teacher)/settings.js` - Added update functionality
- `app/(admin)/settings.js` - Added update functionality
- `app/(franchisee)/settings.js` - Added update functionality
- `app/_layout.js` - Auto-update initialization
- All other settings screens (pending)

### API Endpoints

#### Check Update API
```
GET /api/app/check_update.php?version=1.0.0

Response:
{
  "success": true,
  "has_update": true,
  "latest_version": "1.1.0",
  "download_url": "https://...",
  "release_notes": "What's new...",
  "force_update": false
}
```

### Update Service Methods

```javascript
// Check for updates
await UpdateService.checkForUpdates()

// Manual update check with UI
await UpdateService.manualUpdateCheck()

// Install update
await UpdateService.installUpdate(downloadUrl)

// Auto-update settings
await UpdateService.setAutoUpdateEnabled(true)
await UpdateService.startAutoUpdateCheck()
```

## 🎨 UI Components

### UpdateModal Features
- **Animated Entrance** - Smooth zoom-in animation
- **Version Display** - Current → New version badges
- **Release Notes** - Formatted changelog display
- **Update Type Badge** - Critical vs Optional indicators
- **Feature Highlights** - Key improvements showcase
- **Action Buttons** - Install Now / Later options
- **Loading States** - Installation progress feedback

### Settings Integration
- **Check Update Button** - Added to "More" section in all settings
- **System Update Icon** - Consistent iconography
- **Modern Design** - Matches existing settings UI

## 🔄 Auto-Update Mechanism

### Configuration
```javascript
// Auto-check every 6 hours
const CHECK_INTERVAL = 6 * 60 * 60 * 1000;

// User can enable/disable
await UpdateService.setAutoUpdateEnabled(true);
```

### Behavior
- **Background Checking** - Runs every 6 hours when app is active
- **User Notification** - Shows update modal when available
- **Respect Settings** - Can be disabled by user
- **Smart Timing** - Only checks when app is in foreground

## 📋 Usage Instructions

### For Users
1. **Manual Check**: Go to Settings → More → Check Update
2. **Auto Updates**: Enabled by default, checks every 6 hours
3. **Installation**: Click "Install Now" to download new version
4. **Force Updates**: Critical updates cannot be skipped

### For Developers
1. **Update Backend**: Modify `check_update.php` with new version info
2. **Release Notes**: Update changelog in backend configuration
3. **Download URL**: Ensure APK is available at specified URL
4. **Force Update**: Set `force_update: true` for critical updates

## 🚀 Deployment Checklist

### Backend Setup
- [ ] Upload new APK to download server
- [ ] Update `check_update.php` with new version
- [ ] Test API endpoint returns correct data
- [ ] Verify download URL is accessible

### App Release
- [ ] Update `package.json` and `app.json` version
- [ ] Build and test new APK
- [ ] Upload to download server
- [ ] Update backend configuration
- [ ] Test update flow end-to-end

## 🔧 Configuration Options

### UpdateService Settings
```javascript
// Current version (auto-detected from package.json)
UpdateService.setCurrentVersion('1.0.0');

// Auto-update interval (default: 6 hours)
const INTERVAL = 6 * 60 * 60 * 1000;

// Enable/disable auto-updates
await UpdateService.setAutoUpdateEnabled(true);
```

### Backend Configuration
```php
// In check_update.php
$app_config = [
    'latest_version' => '1.1.0',           // Latest available version
    'download_url' => 'https://...',       // Direct download link
    'release_notes' => 'Changelog...',     // What's new text
    'force_update' => false,               // Mandatory update flag
    'minimum_supported_version' => '1.0.0' // Oldest supported version
];
```

## 🎯 Future Enhancements

### Planned Features
- [ ] **In-App Updates** - Direct APK installation without browser
- [ ] **Delta Updates** - Download only changed files
- [ ] **Rollback Support** - Revert to previous version if issues
- [ ] **Update Scheduling** - Allow users to schedule updates
- [ ] **Bandwidth Awareness** - Check network conditions
- [ ] **Update History** - Track installation history

### Advanced Features
- [ ] **A/B Testing** - Gradual rollout to user segments
- [ ] **Update Analytics** - Track update success rates
- [ ] **Offline Updates** - Cache updates for offline installation
- [ ] **Multi-Language** - Localized release notes
- [ ] **Update Channels** - Beta/Stable release tracks

## 🛠️ Troubleshooting

### Common Issues
1. **Update Check Fails**: Verify API endpoint and network connectivity
2. **Download Issues**: Check download URL accessibility
3. **Installation Problems**: Ensure APK is properly signed
4. **Auto-Update Not Working**: Check if feature is enabled in settings

### Debug Information
```javascript
// Enable debug logging
console.log('Update check result:', updateInfo);
console.log('Current version:', UpdateService.getCurrentVersion());
console.log('Auto-update enabled:', await UpdateService.getAutoUpdateEnabled());
```

## 📞 Support

For technical issues or questions about the update system:
- **Email**: support@tnhappykids.in
- **Phone**: +91 9514900069
- **Documentation**: This file and inline code comments

---

**Last Updated**: November 4, 2024  
**Version**: 1.0.0  
**Author**: Cascade AI Assistant
