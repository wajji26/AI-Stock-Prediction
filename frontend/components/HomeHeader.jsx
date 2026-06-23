import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const MAX_SUGGESTIONS = 8;

export default function HomeHeader({ user, stocks = [] }) {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return stocks
      .filter((s) => {
        const sym = (s.symbol || "").toLowerCase();
        const name = (s.name || "").toLowerCase();
        return sym.includes(term) || name.includes(term);
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [q, stocks]);

  const showDropdown = focused && q.trim().length > 0;

  const handlePick = (symbol) => {
    setQ("");
    setFocused(false);
    router.push(`/stocks/${symbol}`);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Image
            source={{
              uri: `https://ui-avatars.com/api/?name=${
                user?.name || "User"
              }&background=ffffff&color=000000&rounded=true&size=128`,
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color="#9aa0a6" />
          <TextInput
            value={q}
            placeholder="Search ENGRO/MEBL"
            placeholderTextColor="#9aa0a6"
            style={styles.input}
            onChangeText={setQ}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#9aa0a6" />
            </Pressable>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push("/notification")}
          style={styles.icon}
        >
          <Ionicons name="notifications-outline" size={22} color="#e8eaed" />
        </TouchableOpacity>
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          {suggestions.length === 0 ? (
            <Text style={styles.empty}>No matches for &quot;{q}&quot;</Text>
          ) : (
            suggestions.map((s) => {
              const change = Number(s.changePercent ?? 0);
              const positive = change >= 0;
              return (
                <Pressable
                  key={s.symbol}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    pressed && { backgroundColor: "#1f1f24" },
                  ]}
                  onPress={() => handlePick(s.symbol)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionSymbol}>{s.symbol}</Text>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {s.name}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.suggestionPrice}>
                      {Number(s.price ?? 0).toFixed(2)}
                    </Text>
                    <Text
                      style={[
                        styles.suggestionPct,
                        { color: positive ? "#22c55e" : "#ef4444" },
                      ]}
                    >
                      {positive ? "+" : ""}
                      {change.toFixed(2)}%
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: "#0D0D0D",
    zIndex: 10,
  },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 36,
  },
  input: { flex: 1, color: "#fff", marginLeft: 6 },
  icon: { marginLeft: 10 },
  dropdown: {
    marginTop: 6,
    backgroundColor: "#141418",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#23262d",
    overflow: "hidden",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1f24",
  },
  suggestionSymbol: {
    color: "#e8eaed",
    fontSize: 14,
    fontWeight: "700",
  },
  suggestionName: {
    color: "#9aa0a6",
    fontSize: 12,
    marginTop: 2,
  },
  suggestionPrice: {
    color: "#e8eaed",
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionPct: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  empty: {
    color: "#9aa0a6",
    fontSize: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    textAlign: "center",
  },
});
