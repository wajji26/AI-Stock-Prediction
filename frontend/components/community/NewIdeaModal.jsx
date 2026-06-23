import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../config/config";
import { useAuth } from "../../context/AuthContext";
import { createIdea } from "../../data/community";

const SIDES = [
  { key: "long", label: "Long", icon: "trending-up", color: "#16C784" },
  { key: "short", label: "Short", icon: "trending-down", color: "#EA3943" },
  { key: "neutral", label: "Neutral", icon: "remove", color: "#FFD700" },
];

export default function NewIdeaModal({ visible, onClose, onCreated }) {
  const { token } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [symbol, setSymbol] = useState("");
  const [picked, setPicked] = useState(null); // { symbol, name }
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [side, setSide] = useState("long");
  const [saving, setSaving] = useState(false);

  // load the KSE-30 symbol list once for autocomplete
  useEffect(() => {
    if (!visible || stocks.length) return;
    fetch(`${API_URL}/api/stocks/psx-kse30`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.stocks || d.data || [];
        setStocks(
          list
            .map((s) => ({
              symbol: (s.symbol || s.ticker || "").toUpperCase(),
              name: s.name || s.companyName || s.company || "",
            }))
            .filter((s) => s.symbol),
        );
      })
      .catch(() => {});
  }, [visible, stocks.length]);

  const reset = () => {
    setSymbol("");
    setPicked(null);
    setTitle("");
    setBody("");
    setSide("long");
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose?.();
  };

  const suggestions =
    symbol.length > 0 && !picked
      ? stocks
          .filter(
            (s) =>
              s.symbol.includes(symbol.toUpperCase()) ||
              s.name.toUpperCase().includes(symbol.toUpperCase()),
          )
          .slice(0, 6)
      : [];

  const canSubmit = symbol.trim().length > 0 && title.trim().length > 0;

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const res = await createIdea(
        {
          symbol: (picked?.symbol || symbol).toUpperCase(),
          companyName: picked?.name || undefined,
          title: title.trim(),
          body: body.trim(),
          side,
        },
        token,
      );
      if (res?.idea) {
        reset();
        onCreated?.(res.idea);
      } else {
        Alert.alert("Error", "Could not post your idea.");
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Could not post your idea.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Share an idea</Text>
            <TouchableOpacity onPress={close}>
              <Ionicons name="close" size={24} color="#9aa0a6" />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}
          >
            {/* symbol */}
            <Text style={styles.label}>Symbol</Text>
            <View style={styles.inputRow}>
              <Ionicons name="pricetag-outline" size={16} color="#9aa0a6" />
              <TextInput
                value={symbol}
                onChangeText={(t) => {
                  setSymbol(t);
                  setPicked(null);
                }}
                placeholder="e.g. LUCK"
                placeholderTextColor="#6b7280"
                autoCapitalize="characters"
                style={styles.input}
              />
              {picked && <Ionicons name="checkmark-circle" size={18} color="#16C784" />}
            </View>
            {suggestions.length > 0 && (
              <View style={styles.suggestions}>
                {suggestions.map((item) => (
                  <TouchableOpacity
                    key={item.symbol}
                    style={styles.suggestion}
                    onPress={() => {
                      setPicked(item);
                      setSymbol(item.symbol);
                    }}
                  >
                    <Text style={styles.sugSym}>{item.symbol}</Text>
                    <Text style={styles.sugName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* side */}
            <Text style={styles.label}>Direction</Text>
            <View style={styles.sides}>
              {SIDES.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => setSide(s.key)}
                  style={[
                    styles.sideBtn,
                    side === s.key && { borderColor: s.color, backgroundColor: s.color + "22" },
                  ]}
                >
                  <Ionicons
                    name={s.icon}
                    size={15}
                    color={side === s.key ? s.color : "#9aa0a6"}
                  />
                  <Text style={[styles.sideTxt, side === s.key && { color: s.color }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* title */}
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Your thesis in one line"
              placeholderTextColor="#6b7280"
              style={[styles.input, styles.boxInput]}
              maxLength={160}
            />

            {/* body */}
            <Text style={styles.label}>Analysis</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Explain your reasoning (optional)"
              placeholderTextColor="#6b7280"
              style={[styles.input, styles.boxInput, styles.textarea]}
              multiline
              maxLength={5000}
            />

            <TouchableOpacity
              style={[styles.submit, !canSubmit && { opacity: 0.4 }]}
              disabled={!canSubmit || saving}
              onPress={submit}
            >
              {saving ? (
                <ActivityIndicator color="#0D0D0D" />
              ) : (
                <Text style={styles.submitTxt}>Post idea</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: "92%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { color: "#e8eaed", fontSize: 18, fontWeight: "700" },
  formContent: { paddingBottom: 24 },
  label: { color: "#9aa0a6", fontSize: 12, fontWeight: "600", marginTop: 14, marginBottom: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0F0F0F",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: "#e8eaed", paddingVertical: 11, fontSize: 14 },
  boxInput: {
    backgroundColor: "#0F0F0F",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  textarea: { height: 90, textAlignVertical: "top", paddingTop: 10 },
  suggestions: {
    backgroundColor: "#0F0F0F",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 10,
    marginTop: 6,
    maxHeight: 200,
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  sugSym: { color: "#FFD700", fontWeight: "700", fontSize: 13, width: 70 },
  sugName: { color: "#9aa0a6", fontSize: 12, flex: 1 },
  sides: { flexDirection: "row", gap: 8 },
  sideBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#262626",
  },
  sideTxt: { color: "#9aa0a6", fontSize: 13, fontWeight: "600" },
  submit: {
    backgroundColor: "#FFD700",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 22,
  },
  submitTxt: { color: "#0D0D0D", fontWeight: "800", fontSize: 15 },
});
