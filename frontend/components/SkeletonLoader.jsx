// components/ScreenSkeleton.js
import React from "react";
import { View, StyleSheet } from "react-native";
import Skeleton from "./Skeleton";

export default function SkeletonLoader() {
  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.row}>
        <Skeleton style={{ width: 120, height: 22, borderRadius: 6 }} />
        <Skeleton style={{ width: 70, height: 22, borderRadius: 6 }} />
      </View>

      {/* Summary cards */}
      <View style={styles.row}>
        <Skeleton style={{ flex: 1, height: 60, marginRight: 8 }} />
        <Skeleton style={{ flex: 1, height: 60, marginLeft: 8 }} />
      </View>

      {/* List items */}
      <View style={{ marginTop: 16 }}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <View key={idx} style={styles.listItem}>
            <Skeleton style={{ width: 40, height: 40, borderRadius: 20 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Skeleton style={{ width: "60%", height: 14, marginBottom: 6 }} />
              <Skeleton style={{ width: "40%", height: 12 }} />
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Skeleton style={{ width: 60, height: 14, marginBottom: 6 }} />
              <Skeleton style={{ width: 50, height: 16, borderRadius: 8 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    justifyContent: "space-between",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
});
