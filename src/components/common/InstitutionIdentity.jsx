import React from "react";
import { Text, View } from "react-native";
import { INSTITUTION } from "../../constants/institution";
import { Colors } from "../../constants/colors";
export function InstitutionIdentity({ inverse = false, centered = false }) {
  return (
    <View
      style={{
        marginTop: 8,
        gap: 2,
        alignItems: centered ? "center" : "flex-start",
      }}
    >
      <Text
        style={{
          color: inverse ? "#FFFFFF" : Colors.textPrimary,
          fontSize: 13,
          fontWeight: "600",
          textAlign: centered ? "center" : "left",
        }}
      >
        {INSTITUTION.university}
      </Text>
      <Text
        style={{
          color: inverse ? "#CBD5E1" : Colors.textSecondary,
          fontSize: 12,
          textAlign: centered ? "center" : "left",
        }}
      >
        {INSTITUTION.faculty}
      </Text>
    </View>
  );
}
