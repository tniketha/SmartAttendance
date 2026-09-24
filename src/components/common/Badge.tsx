import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';

interface BadgeProps {
  label: string;
  variant?: 'present' | 'absent' | 'late' | 'excused' | 'default' | 'active' | 'closed';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', style, textStyle }) => {
  const { Colors } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const getBadgeStyle = () => {
    switch (variant) {
      case 'present':
      case 'active':
        return { bg: Colors.presentBg, text: Colors.present };
      case 'absent':
      case 'closed':
        return { bg: Colors.absentBg, text: Colors.absent };
      case 'late':
        return { bg: Colors.lateBg, text: Colors.late };
      case 'excused':
        return { bg: Colors.excusedBg, text: Colors.excused };
      default:
        return { bg: '#E2E8F0', text: '#475569' };
    }
  };

  const colors = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }, textStyle]}>{label}</Text>
    </View>
  );
};

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
