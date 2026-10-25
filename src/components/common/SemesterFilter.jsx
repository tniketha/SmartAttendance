import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Colors } from "../../constants/colors";
import {
  ALL_SEMESTERS,
  semesterKey,
  semesterLabel,
  semesterOptions,
} from "../../utils/semester.utils";
export function SemesterFilter({ items, value, onChange }) {
  const options = [
    {
      key: ALL_SEMESTERS,
      label: "All semesters",
    },
    ...semesterOptions(items).map((term) => ({
      key: semesterKey(term),
      label: semesterLabel(term),
    })),
  ];
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Academic semester"
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginVertical: 12,
      }}
    >
      {options.map((option) => (
        <TouchableOpacity
          key={option.key}
          onPress={() => onChange(option.key)}
          accessibilityRole="radio"
          accessibilityState={{
            checked: value === option.key,
          }}
          aria-checked={value === option.key}
          accessibilityLabel={option.label}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Colors.border,
            backgroundColor:
              value === option.key ? Colors.primaryDark : Colors.surface,
          }}
        >
          <Text
            style={{
              color: value === option.key ? "#FFFFFF" : Colors.textSecondary,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
