// components/Skeleton.js
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

export default function Skeleton({ style }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.03,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    const loopOpacity = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    loopOpacity.start();

    return () => {
      loop.stop();
      loopOpacity.stop();
    };
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[styles.base, { transform: [{ scale }], opacity }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    overflow: "hidden",
  },
});
