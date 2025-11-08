// Light theme colors
const lightTheme = {
  // Primary Brand Colors - Yellow, Black & White Theme
  primary: '#FFD700',        // Bright Yellow - Main brand color
  primaryLight: '#FFEC8B',   // Light Yellow
  primaryDark: '#FFC400',    // Dark Yellow
  
  secondary: '#000000',      // Black - Secondary brand color
  secondaryLight: '#333333', // Dark Gray
  secondaryDark: '#000000',  // Pure Black
  
  accent: '#FFA000',         // Amber Yellow - Accent color
  accentLight: '#FFD54F',    // Light Amber
  accentDark: '#FF8F00',     // Dark Amber

  // Functional Colors - Yellow/Black/White Theme
  success: '#FFD700',        // Yellow for success
  successLight: '#FFEC8B',   
  successDark: '#FFC400',    
    
  warning: '#FFA000',        // Amber for warnings
  warningLight: '#FFD54F',   
  warningDark: '#FF8F00',    
    
  danger: '#FF6B35',         // Orange-Red for danger
  dangerLight: '#FFA07A',    
  dangerDark: '#FF4500',     
  
  info: '#FFD700',           // Yellow for info
  infoLight: '#FFEC8B',      
  infoDark: '#FFC400',      

  // Neutral Colors - White & Black Theme with proper hierarchy
  background: '#FFFFFF',     // Pure white background
  surface: '#FFFFFF',        // Pure white for main surfaces
  surfaceVariant: '#F8F8F8', // Light gray for variant surfaces
  surfaceDark: '#F0F0F0',    // Medium gray for dark surfaces
  
  text: '#000000',           // Black for text
  textSecondary: '#666666',  // Medium gray for secondary text
  textLight: '#999999',      // Light gray for disabled text
  textOnPrimary: '#000000',  // Black text on yellow colors
  textOnDark: '#FFFFFF',     // White text on black backgrounds
  
  border: '#E0E0E0',         // Light border
  borderLight: '#F0F0F0',    // Very light border
  divider: '#EEEEEE',        // Divider lines
  
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  shadow: 'rgba(0, 0, 0, 0.15)',

  // Container Colors - Different white/gray variations for hierarchy
  containerLight: '#FFFFFF',     // Pure white container
  containerMedium: '#F8F8F8',    // Light gray container
  containerDark: '#F0F0F0',      // Medium gray container
  containerAccent: '#FFFDE7',    // Soft yellow tinted container
  
  // Card Colors - Different variations for visual hierarchy
  cardPrimary: '#FFFFFF',        // White card
  cardSecondary: '#F8F8F8',      // Light gray card
  cardAccent: '#FFF9C4',         // Yellow tinted card
  
  // Input Colors
  inputBackground: '#FFFFFF',
  inputBorder: '#E0E0E0',
  inputFocus: '#FFD700',
  
  // Button Colors
  buttonPrimary: '#FFD700',
  buttonSecondary: '#000000',
  buttonDisabled: '#CCCCCC',

  // Status Colors
  online: '#FFD700',
  offline: '#999999',
  busy: '#FFA000',
  away: '#FFC400',
  
  // Legacy Support
  white: '#FFFFFF',
  black: '#000000',
  lightGray: '#F8F8F8',
  light_gray: '#F8F8F8',
  placeholder: '#999999',
  black_80: 'rgba(0, 0, 0, 0.8)',
  
  // Additional properties
  lightText: '#999999',     // Changed to proper light text color
  card: '#FFFFFF',
  gray: '#666666',
  primary_light: '#FFEC8B',
  
  // Gradient arrays for backward compatibility
  gradientMint: ['#FFD700', '#FFC400'],
  gradientGrass: ['#FFD700', '#FFC400'],
  gradientOcean: ['#FFD700', '#FFC400'],
  
  // Legacy gradient names
  gradient1: ['#FFD700', '#FFC400'],
  gradient2: ['#000000', '#333333'],
  gradient3: ['#FFD700', '#FFC400'],
  gradient4: ['#FFA000', '#FF8F00'],
  gradient5: ['#FF6B35', '#FF4500'],
  gradient6: ['#FFD700', '#FFC400'],
  gradient7: ['#FFD700', '#FFEC8B'],
  gradient8: ['#FFA000', '#FFD54F'],

  // New consistent gradients
  gradientPrimary: ['#FFD700', '#FFC400'],
  gradientSecondary: ['#000000', '#333333'],
  gradientAccent: ['#FFA000', '#FF8F00'],
  gradientSuccess: ['#FFD700', '#FFC400'],
  gradientWarning: ['#FFA000', '#FF8F00'],
  gradientDanger: ['#FF6B35', '#FF4500'],
  gradientInfo: ['#FFD700', '#FFC400'],
  
  // Container gradients with proper variations
  gradientMain: ['#FFD700', '#FFC400'],
  gradientCard: ['#FFFFFF', '#F8F8F8'],
  gradientSoft: ['#FFFDE7', '#FFF9C4'],
  gradientWarm: ['#FFF8E1', '#FFECB3'],
  gradientCool: ['#FFFFFF', '#F5F5F5'],
  gradientNeutral: ['#FFFFFF', '#F8F8F8'],
  gradientOrange: ['#FFA000', '#FF8F00'],
  gradientDark: ['#000000', '#333333'],
  gradientLight: ['#FFFFFF', '#F8F8F8'],
};

// Dark theme colors
const darkTheme = {
  // Primary Brand Colors - Yellow remains consistent but adjusted for dark mode
  primary: '#FFD700',        // Bright Yellow - Main brand color
  primaryLight: '#FFEC8B',   // Light Yellow
  primaryDark: '#FFC400',    // Dark Yellow
  
  secondary: '#FFFFFF',      // White - Secondary brand color in dark mode
  secondaryLight: '#CCCCCC', // Light Gray
  secondaryDark: '#FFFFFF',  // Pure White
  
  accent: '#FFA000',         // Amber Yellow - Accent color
  accentLight: '#FFD54F',    // Light Amber
  accentDark: '#FF8F00',     // Dark Amber

  // Functional Colors - Adjusted for dark mode
  success: '#4CAF50',        // Green for success in dark mode
  successLight: '#81C784',   
  successDark: '#388E3C',    
    
  warning: '#FFA000',        // Amber for warnings
  warningLight: '#FFD54F',   
  warningDark: '#FF8F00',    
    
  danger: '#F44336',         // Red for danger in dark mode
  dangerLight: '#EF5350',    
  dangerDark: '#D32F2F',     
  
  info: '#2196F3',           // Blue for info in dark mode
  infoLight: '#64B5F6',      
  infoDark: '#1976D2',      

  // Neutral Colors - Dark theme with proper hierarchy
  background: '#121212',     // Dark background
  surface: '#1E1E1E',        // Dark surface
  surfaceVariant: '#2C2C2C', // Lighter dark for variant surfaces
  surfaceDark: '#0F0F0F',    // Darker surface
  
  text: '#FFFFFF',           // White for text
  textSecondary: '#B3B3B3',  // Light gray for secondary text
  textLight: '#808080',      // Medium gray for disabled text
  textOnPrimary: '#000000',  // Black text on yellow colors
  textOnDark: '#FFFFFF',     // White text on dark backgrounds
  
  border: '#404040',         // Dark border
  borderLight: '#303030',    // Darker border
  divider: '#2C2C2C',        // Dark divider lines
  
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.3)',

  // Container Colors - Dark variations
  containerLight: '#1E1E1E',     // Dark container
  containerMedium: '#2C2C2C',    // Medium dark container
  containerDark: '#0F0F0F',      // Darker container
  containerAccent: '#2A2A00',    // Dark yellow tinted container
  
  // Card Colors - Dark variations
  cardPrimary: '#1E1E1E',        // Dark card
  cardSecondary: '#2C2C2C',      // Lighter dark card
  cardAccent: '#3A3A00',         // Dark yellow tinted card
  
  // Input Colors
  inputBackground: '#2C2C2C',
  inputBorder: '#404040',
  inputFocus: '#FFD700',
  
  // Button Colors
  buttonPrimary: '#FFD700',
  buttonSecondary: '#FFFFFF',
  buttonDisabled: '#666666',

  // Status Colors
  online: '#4CAF50',
  offline: '#666666',
  busy: '#FFA000',
  away: '#FFC400',
  
  // Legacy Support
  white: '#1E1E1E',          // Dark equivalent of white
  black: '#FFFFFF',          // Light equivalent of black
  lightGray: '#2C2C2C',      // Dark equivalent of light gray
  light_gray: '#2C2C2C',
  placeholder: '#808080',
  black_80: 'rgba(255, 255, 255, 0.8)',
  
  // Additional properties
  lightText: '#808080',
  card: '#1E1E1E',
  gray: '#B3B3B3',
  primary_light: '#FFEC8B',
  
  // Gradient arrays for dark mode
  gradientMint: ['#4CAF50', '#388E3C'],
  gradientGrass: ['#4CAF50', '#388E3C'],
  gradientOcean: ['#2196F3', '#1976D2'],
  
  // Legacy gradient names - adjusted for dark mode
  gradient1: ['#FFD700', '#FFC400'],
  gradient2: ['#FFFFFF', '#CCCCCC'],
  gradient3: ['#FFD700', '#FFC400'],
  gradient4: ['#FFA000', '#FF8F00'],
  gradient5: ['#F44336', '#D32F2F'],
  gradient6: ['#FFD700', '#FFC400'],
  gradient7: ['#FFD700', '#FFEC8B'],
  gradient8: ['#FFA000', '#FFD54F'],

  // New consistent gradients for dark mode
  gradientPrimary: ['#FFD700', '#FFC400'],
  gradientSecondary: ['#FFFFFF', '#CCCCCC'],
  gradientAccent: ['#FFA000', '#FF8F00'],
  gradientSuccess: ['#4CAF50', '#388E3C'],
  gradientWarning: ['#FFA000', '#FF8F00'],
  gradientDanger: ['#F44336', '#D32F2F'],
  gradientInfo: ['#2196F3', '#1976D2'],
  
  // Container gradients for dark mode
  gradientMain: ['#FFD700', '#FFC400'],
  gradientCard: ['#1E1E1E', '#2C2C2C'],
  gradientSoft: ['#2A2A00', '#3A3A00'],
  gradientWarm: ['#2C1F00', '#3D2A00'],
  gradientCool: ['#1E1E1E', '#2C2C2C'],
  gradientNeutral: ['#1E1E1E', '#2C2C2C'],
  gradientOrange: ['#FFA000', '#FF8F00'],
  gradientDark: ['#0F0F0F', '#1E1E1E'],
  gradientLight: ['#2C2C2C', '#404040'],
};

// Function to get colors based on theme
const getColors = (isDarkMode = false) => {
  return isDarkMode ? darkTheme : lightTheme;
};

// Export both individual themes and the function
export { lightTheme, darkTheme, getColors };

// Default export for backward compatibility (light theme)
export default lightTheme;
