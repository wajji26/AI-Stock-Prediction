import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/config";
import { signInWithProvider } from "../utils/oauth";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null); // "google" | "discord"

  const handleSocialAuth = async (provider) => {
    try {
      setError("");
      setSocialLoading(provider);
      const result = await signInWithProvider(provider);
      if (result.type !== "success") return; // user cancelled
      await login(result.user, result.token);
      router.replace("/home");
    } catch (err) {
      setError(
        `Couldn't sign in with ${provider}. Please try again.`,
      );
      console.log(`${provider} login error:`, err);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleLogin = async () => {
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data.message === "Invalid credentials"
            ? "Incorrect email or password. Please try again."
            : data.message || "Login failed. Please try again.",
        );
        return;
      }

      // data should contain { user, token }
      await login(data.user, data.token);

      // Go to main app (e.g. tabs)
      router.replace("/home");
    } catch (err) {
      setError(
        "Can't reach the server. Please check your connection and try again.",
      );
      console.log("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Login</Text>

          <TouchableOpacity onPress={() => router.push("/signup")}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View style={styles.content}>
          {/* Email / Phone Toggle */}

          {/* Email or Phone Input */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIcon}>
              <MaterialIcons name="email" size={18} color="#B0B0B0" />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666872"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIcon}>
              <Ionicons name="lock-closed-outline" size={18} color="#B0B0B0" />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666872"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />

            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#666872"
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          {/* <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push("/forgot-password")}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password</Text>
          </TouchableOpacity> */}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>
              {loading ? (
                <ActivityIndicator size="small" color="#141414" />
              ) : (
                "Login Now"
              )}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.alreadyRow}
            onPress={() => router.push("/signup")}
          >
            <Text style={styles.alreadyText}>
              Already have an account?{" "}
              <Text style={styles.alreadyLink}>Signup</Text>
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or go with</Text>
            <View style={styles.divider} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialAuth("google")}
              disabled={socialLoading !== null}
            >
              {socialLoading === "google" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <FontAwesome5 name="google" size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleSocialAuth("discord")}
              disabled={socialLoading !== null}
            >
              {socialLoading === "discord" ? (
                <ActivityIndicator size="small" color="#5865F2" />
              ) : (
                <FontAwesome5 name="discord" size={22} color="#5865F2" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    alignItems: "center",
  },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "700" },
  signUpText: { color: "#FFA726", fontWeight: "600" },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(234,57,67,0.12)",
    borderWidth: 1,
    borderColor: "rgba(234,57,67,0.5)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  errorText: { color: "#FF6B6B", fontSize: 13, fontWeight: "500", flex: 1 },

  toggleContainer: { flexDirection: "row", marginBottom: 20 },
  toggleButton: {
    flex: 1,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
  },
  toggleButtonActive: { backgroundColor: "#1F1F23" },
  toggleText: { color: "#777B82" },
  toggleTextActive: { color: "#FFF", fontWeight: "600" },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131316",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 56,
    marginBottom: 16,
  },
  inputIcon: { width: 30, alignItems: "center" },
  input: { flex: 1, color: "#FFF", fontSize: 15 },
  eyeIcon: { paddingHorizontal: 6 },

  forgotPassword: { alignSelf: "flex-end", marginBottom: 20 },
  forgotPasswordText: { color: "#FFA726", fontWeight: "600" },

  loginButton: {
    height: 56,
    backgroundColor: "#FFD700",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  loginButtonText: { color: "#000", fontWeight: "700", fontSize: 16 },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  divider: { flex: 1, height: 1, backgroundColor: "#2A2A2E" },
  dividerText: { color: "#6F727A", marginHorizontal: 10 },

  socialRow: { flexDirection: "row", justifyContent: "center", gap: 30 },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#2C2C31",
    justifyContent: "center",
    alignItems: "center",
  },
  alreadyRow: {
    marginTop: 20,
    alignItems: "center",
  },
  alreadyText: {
    color: "#9A9CA4",
    fontSize: 13,
  },
  alreadyLink: {
    color: "#FFA726",
    fontWeight: "600",
  },
});
