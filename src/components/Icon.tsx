import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  style?: any;
}

export default function Icon({ name, size = 24, color, style }: IconProps) {
  const { colors } = useTheme();
  const iconColor = color || colors.text;

  return (
    <Ionicons 
      name={name} 
      size={size} 
      color={iconColor} 
      style={style}
    />
  );
}
