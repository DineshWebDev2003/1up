import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

const TNKidsLogo = ({ size = 120, showText = true, style = {} }) => {
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFD700" />
            <Stop offset="100%" stopColor="#FFA500" />
          </LinearGradient>
          <LinearGradient id="blackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2C2C2C" />
            <Stop offset="100%" stopColor="#000000" />
          </LinearGradient>
          <LinearGradient id="whiteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#F8F9FA" />
          </LinearGradient>
        </Defs>
        
        {/* Outer Shadow Circle */}
        <Circle
          cx="62"
          cy="62"
          r="55"
          fill="rgba(0,0,0,0.2)"
        />
        
        {/* Main Circle Background */}
        <Circle
          cx="60"
          cy="60"
          r="55"
          fill="url(#yellowGradient)"
          stroke="#000"
          strokeWidth="3"
        />
        
        {/* Inner Circle */}
        <Circle
          cx="60"
          cy="60"
          r="42"
          fill="url(#whiteGradient)"
          stroke="#000"
          strokeWidth="2"
        />
        
        {/* TN Text */}
        <SvgText
          x="60"
          y="52"
          fontSize="28"
          fontWeight="bold"
          fill="url(#blackGradient)"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
        >
          TN
        </SvgText>
        
        {/* Kids+ Text */}
        <SvgText
          x="60"
          y="75"
          fontSize="14"
          fontWeight="600"
          fill="#FFA500"
          textAnchor="middle"
          fontFamily="Arial, sans-serif"
        >
          Kids+
        </SvgText>
        
        {/* Decorative Elements - Stars */}
        <Path
          d="M88 22 L89.5 27 L94.5 27 L90.5 30.5 L92 35.5 L88 32 L84 35.5 L85.5 30.5 L81.5 27 L86.5 27 Z"
          fill="#FFD700"
          stroke="#000"
          strokeWidth="0.5"
        />
        
        <Path
          d="M28 88 L29 91 L32 91 L29.5 93 L30.5 96 L28 94 L25.5 96 L26.5 93 L24 91 L27 91 Z"
          fill="#FFD700"
          stroke="#000"
          strokeWidth="0.5"
        />
        
        {/* Additional small stars */}
        <Circle cx="25" cy="30" r="2" fill="#FFD700" />
        <Circle cx="95" cy="85" r="1.5" fill="#FFA500" />
        <Circle cx="20" cy="60" r="1" fill="#FFD700" />
        <Circle cx="100" cy="40" r="1" fill="#FFA500" />
        
        {/* Plus Symbol */}
        <Rect
          x="96"
          y="58"
          width="8"
          height="3"
          fill="#FFA500"
          rx="1.5"
        />
        <Rect
          x="97.5"
          y="56.5"
          width="3"
          height="8"
          fill="#FFA500"
          rx="1.5"
        />
      </Svg>
      
      {showText && (
        <Text style={{
          fontSize: size * 0.15,
          fontWeight: 'bold',
          color: '#2C2C2C',
          marginTop: 8,
          textAlign: 'center',
          textShadowColor: 'rgba(0,0,0,0.1)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        }}>
          TN Kids+
        </Text>
      )}
    </View>
  );
};

export default TNKidsLogo;
