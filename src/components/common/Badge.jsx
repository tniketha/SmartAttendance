import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";
export const Badge = ({ label, variant = "default", style, textStyle }) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case "present":
      case "active":
        return {
          bg: Colors.presentBg,
          text: Colors.present,
        };
      case "absent":
      case "closed":
        return {
          bg: Colors.absentBg,
          text: Colors.absent,
        };
      case "late":
        return {
          bg: Colors.lateBg,
          text: Colors.late,
        };
      default:
        return {
          bg: "#E2E8F0",
          text: "#475569",
        };
    }
  };
  const colors = getBadgeStyle();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};
const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
