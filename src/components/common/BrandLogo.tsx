import React from 'react';
import { Image } from 'react-native';

/** Shared artwork for sign-in, loading and navigation surfaces. */
export function BrandLogo({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={require('../../../assets/brand/logo.png')}
      style={{ width: size, height: size, flexShrink: 0 }}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Smart Attendance logo"
    />
  );
}
