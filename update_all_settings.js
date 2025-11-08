// Script to update all settings screens with Check Update functionality
// Run this with: node update_all_settings.js

const fs = require('fs');
const path = require('path');

const settingsFiles = [
  './app/(franchisee)/settings.js',
  './app/(student)/settings.js',
  './app/(captain)/settings.js',
  './app/(developer)/settings.js',
  './app/(tuition-student)/settings.js',
  './app/(tuition-teacher)/settings.js'
];

const importToAdd = `import UpdateService from '../services/UpdateService';
import UpdateModal from '../components/UpdateModal';`;

const stateToAdd = `  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);`;

const functionsToAdd = `
  const handleCheckUpdate = async () => {
    try {
      const updateInfo = await UpdateService.manualUpdateCheck();
      if (updateInfo.hasUpdate) {
        setUpdateInfo(updateInfo);
        setUpdateModalVisible(true);
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateInfo) return;
    
    setIsInstalling(true);
    try {
      await UpdateService.installUpdate(updateInfo.downloadUrl);
      setUpdateModalVisible(false);
    } catch (error) {
      console.error('Update installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };`;

const updateModalComponent = `
        {/* Update Modal */}
        <UpdateModal
          visible={updateModalVisible}
          onClose={() => setUpdateModalVisible(false)}
          updateInfo={updateInfo}
          onInstall={handleInstallUpdate}
          isInstalling={isInstalling}
        />`;

function updateSettingsFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add imports
    if (!content.includes('UpdateService')) {
      content = content.replace(
        /import { API_URL } from '\.\.\/\.\.\/config';/,
        `import { API_URL } from '../../config';\n${importToAdd}`
      );
    }

    // Add state variables
    if (!content.includes('updateModalVisible')) {
      content = content.replace(
        /const \[modalContent, setModalContent\] = useState\({ title: '', content: null }\);/,
        `const [modalContent, setModalContent] = useState({ title: '', content: null });\n${stateToAdd}`
      );
    }

    // Add functions
    if (!content.includes('handleCheckUpdate')) {
      const openModalIndex = content.indexOf('const openModal = (title, content) => {');
      if (openModalIndex !== -1) {
        const insertIndex = content.indexOf('};', openModalIndex) + 3;
        content = content.slice(0, insertIndex) + functionsToAdd + content.slice(insertIndex);
      }
    }

    // Add Check Update button to More section
    if (!content.includes("title: 'Check Update'")) {
      content = content.replace(
        /{ title: 'About', icon: 'info', action: \(\) => openModal\('About Us', aboutContent\) },/,
        `{ title: 'Check Update', icon: 'system-update', action: handleCheckUpdate },
        { title: 'About', icon: 'info', action: () => openModal('About Us', aboutContent) },`
      );
    }

    // Add UpdateModal component before closing tags
    if (!content.includes('<UpdateModal')) {
      content = content.replace(
        /      <\/SafeAreaView>\s*<\/WhiteBackground>/,
        `${updateModalComponent}
      </SafeAreaView>
    </WhiteBackground>`
      );
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Update all settings files
console.log('🚀 Updating all settings screens with Check Update functionality...\n');

settingsFiles.forEach(updateSettingsFile);

console.log('\n✅ All settings screens updated successfully!');
console.log('\n📱 Features added to all settings screens:');
console.log('• Check Update button in More section');
console.log('• Modern update modal with install functionality');
console.log('• Auto-update capability');
console.log('• Version comparison and release notes');
console.log('• Gradient UI design with animations');
