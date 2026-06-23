import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ConfirmModal({
  func,
  confirmActionName,
  style,
  icon,
  disabled,
  textStyle,
  actionBtnColor,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onConfirm = async () => {
    try {
      setLoading(true);
      // Your existing logout logic (clear token, call API, navigate, etc.)
      await func?.();
    } finally {
      // If handleLogout navigates away, this may never be seen (that's fine)
      setLoading(false);
      setModalOpen(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={style}>
          {icon}
          <Text style={textStyle}>{confirmActionName}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loading) setModalOpen(false);
        }}
      >
        <View style={styles.logoutBackdrop}>
          <View style={styles.logoutCard}>
            <Text style={styles.logoutTitle}>Confirm {confirmActionName}</Text>
            <Text style={styles.logoutDesc}>This action can't be undone</Text>

            <View style={styles.logoutActions}>
              <Pressable
                onPress={() => setModalOpen(false)}
                disabled={loading}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  styles.logoutCancelBtn,
                  pressed && !loading && styles.pressed,
                  loading && styles.disabled,
                ]}
              >
                <Text style={styles.logoutCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={onConfirm}
                disabled={loading}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  styles.logoutConfirmBtn,
                  { backgroundColor: actionBtnColor || "#FFD700" },
                  pressed && !loading && styles.pressed,
                  loading && styles.disabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#141414" />
                ) : (
                  <Text style={styles.logoutConfirmText}>
                    {confirmActionName}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  footerText: {
    color: "#A9A9A9",
    fontSize: 16,
    fontWeight: "400",
    paddingVertical: 10,
  },

  logoutBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  logoutCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#1d1d1dff",
    borderWidth: 1,
    // borderColor: "rgba(255, 215, 0, 0.25)",
  },

  logoutTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },

  logoutDesc: {
    marginTop: 6,
    color: "#9A9A9A",
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },

  logoutActions: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },

  logoutBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutCancelBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "transparent",
  },

  // logoutConfirmBtn: {
  //   backgroundColor: "#FFD700",
  // },

  logoutCancelText: {
    color: "#E6E6E6",
    fontSize: 14,
    fontWeight: "400",
  },

  logoutConfirmText: {
    color: "#141414",
    fontSize: 14,
    fontWeight: "500",
  },

  pressed: {
    opacity: 0.85,
  },

  disabled: {
    opacity: 0.6,
  },
});
