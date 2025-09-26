import Colors from './colors';

export default {
  // Typography Scale
  typography: {
    // Headers
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
      lineHeight: 40,
      color: Colors.text,
    },
    h2: {
      fontSize: 28,
      fontWeight: 'bold',
      lineHeight: 36,
      color: Colors.text,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
      color: Colors.text,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
      color: Colors.text,
    },
    h5: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      color: Colors.text,
    },
    h6: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
      color: Colors.text,
    },
    
    // Body Text
    body1: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      color: Colors.text,
    },
    body2: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: Colors.text,
    },
    
    // Captions and Small Text
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      color: Colors.textSecondary,
    },
    overline: {
      fontSize: 10,
      fontWeight: '500',
      lineHeight: 14,
      color: Colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    
    // Button Text
    button: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      color: Colors.textOnPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    
    // Special Playful Typography
    playful: {
      fontSize: 18,
      fontWeight: 'bold',
      lineHeight: 24,
      color: Colors.primary,
    },
  },

  // Spacing Scale (based on 8px grid)
  spacing: {
    xs: 4,    // Extra small
    sm: 8,    // Small
    md: 16,   // Medium
    lg: 24,   // Large
    xl: 32,   // Extra large
    xxl: 48,  // Double extra large
    xxxl: 64, // Triple extra large
  },

  // Border Radius Scale
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 999,
  },

  // Shadow Definitions
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
  },

  // Component Styles
  components: {
    // Card Styles
    card: {
      default: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      },
      elevated: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
      },
      playful: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 16,
        borderWidth: 2,
        borderColor: Colors.primaryLight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      },
    },

    // Button Styles
    button: {
      primary: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      secondary: {
        backgroundColor: Colors.secondary,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 22,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
      },
      fab: {
        backgroundColor: Colors.primary,
        borderRadius: 28,
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
      },
    },

    // Input Styles
    input: {
      default: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: Colors.text,
      },
      focused: {
        borderColor: Colors.primary,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      error: {
        borderColor: Colors.danger,
        borderWidth: 2,
      },
    },

    // Tab Bar Styles
    tabBar: {
      container: {
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        paddingBottom: 8,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      },
      tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
      },
      activeTab: {
        backgroundColor: Colors.primaryLight,
        borderRadius: 20,
        marginHorizontal: 4,
      },
    },

    // Header Styles
    header: {
      default: {
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        paddingVertical: 16,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
      gradient: {
        paddingVertical: 16,
        paddingHorizontal: 20,
      },
    },
  },

  // Animation Durations
  animations: {
    fast: 200,
    normal: 300,
    slow: 500,
  },

  // Screen Breakpoints
  breakpoints: {
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
  },
};
