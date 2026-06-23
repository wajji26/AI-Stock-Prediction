// app/index.tsx
import React from "react";
import { Redirect } from "expo-router";

export default function Index() {
  // If you want to start from some other page, like /home or /auth/login:
  return <Redirect href="/(tabs)/home" />; // or "/auth/login", "/(tabs)", etc.
}
