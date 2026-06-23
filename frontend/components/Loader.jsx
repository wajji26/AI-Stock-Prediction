import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";

export default function CandlesLoader() {
  const c1 = useRef(new Animated.Value(1)).current;
  const c2 = useRef(new Animated.Value(1)).current;
  const c3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const buildLoop = (val) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1.4,
            duration: 600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.8,
            duration: 600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = buildLoop(c1);
    const a2 = buildLoop(c2);
    const a3 = buildLoop(c3);

    a1.start();
    const t2 = setTimeout(() => a2.start(), 200);
    const t3 = setTimeout(() => a3.start(), 400);

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [c1, c2, c3]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Animated.View
          style={[styles.candle, { transform: [{ scaleY: c1 }] }]}
        />
        <Animated.View
          style={[styles.candle, { transform: [{ scaleY: c2 }] }]}
        />
        <Animated.View
          style={[styles.candle, { transform: [{ scaleY: c3 }] }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: "#050507",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  candle: {
    width: 8,
    height: 32,
    borderRadius: 6,
    marginHorizontal: 5,
    backgroundColor: "#FFD700",
  },
});
