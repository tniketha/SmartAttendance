import React from "react";
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
export function QRCodeCanvas({ value, size = 220 }) {
  return (
    <View
      style={{
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
      }}
    >
      <QRCode
        value={value}
        size={size}
        backgroundColor="#FFFFFF"
        color="#0F172A"
      />
    </View>
  );
}
