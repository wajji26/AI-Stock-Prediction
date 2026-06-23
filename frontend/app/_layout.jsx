import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { DataProvider } from "../context/DataContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { Text, TextInput } from "react-native";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";

const FONT_BY_WEIGHT = {
  "100": "Inter_400Regular",
  "200": "Inter_400Regular",
  "300": "Inter_400Regular",
  "400": "Inter_400Regular",
  normal: "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  bold: "Inter_700Bold",
  "800": "Inter_800ExtraBold",
  "900": "Inter_800ExtraBold",
};

function patchComponent(Component) {
  if (Component.__interPatched) return;
  const origRender = Component.render;
  if (typeof origRender !== "function") return;
  Component.render = function (...args) {
    const el = origRender.apply(this, args);
    if (!el) return el;
    const styleArr = Array.isArray(el.props.style)
      ? el.props.style
      : [el.props.style];
    const flat = Object.assign(
      {},
      ...styleArr.filter((s) => s && typeof s === "object"),
    );
    const weight = flat.fontWeight != null ? String(flat.fontWeight) : "400";
    const family = FONT_BY_WEIGHT[weight] || "Inter_400Regular";
    return {
      ...el,
      props: {
        ...el.props,
        style: [{ fontFamily: family }, el.props.style],
      },
    };
  };
  Component.__interPatched = true;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync("#05060A");
    NavigationBar.setBorderColorAsync("#05060A");
  }, []);

  if (!fontsLoaded) return null;
  patchComponent(Text);
  patchComponent(TextInput);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: "#05060A" }}>
        <AuthProvider>
          <DataProvider>
            <AuthNav />
          </DataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AuthNav() {
  const { token, loading } = useAuth();

  if (loading) return null; // splash

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!token ? (
        <>
          <Stack.Screen name="_login" />
          <Stack.Screen name="_signup" />
        </>
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
    </Stack>
  );
}
