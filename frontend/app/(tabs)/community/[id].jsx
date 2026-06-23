import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import StockCandleChart from "../../../components/StockCandleChart";
import { useAuth } from "../../../context/AuthContext";
import { API_URL } from "../../../config/config";
import {
  addComment,
  boostIdea,
  deleteIdea,
  fetchIdea,
  timeAgo,
} from "../../../data/community";

const SIDE_META = {
  long: { label: "Long", color: "#16C784", icon: "trending-up" },
  short: { label: "Short", color: "#EA3943", icon: "trending-down" },
  neutral: { label: "Idea", color: "#FFD700", icon: "remove" },
};

export default function IdeaDetail() {
  const { id } = useLocalSearchParams();
  const { token, user } = useAuth();

  const [idea, setIdea] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [chart, setChart] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  const [boosted, setBoosted] = useState(false);
  const [boostCount, setBoostCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchIdea(id, token);
      const it = res.idea;
      setIdea(it);
      setBoosted(!!it.boostedByMe);
      setBoostCount(it.boostCount || 0);
      // fetch the live chart for this symbol
      setChartLoading(true);
      fetch(
        `${API_URL}/api/stocks/psx/${encodeURIComponent(it.symbol)}/history?range=1mo&interval=1d`,
      )
        .then((r) => r.json())
        .then((d) => setChart(d))
        .catch(() => setChart(null))
        .finally(() => setChartLoading(false));
    } catch (e) {
      setError("Couldn't load this idea.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const onBoost = async () => {
    if (!token) return router.push("/profile");
    const next = !boosted;
    setBoosted(next);
    setBoostCount((c) => c + (next ? 1 : -1));
    try {
      const res = await boostIdea(id, token);
      setBoosted(res.boosted);
      setBoostCount(res.boostCount);
    } catch {
      setBoosted(!next);
      setBoostCount(idea?.boostCount || 0);
    }
  };

  const onComment = async () => {
    if (!token) return router.push("/profile");
    const text = commentText.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const res = await addComment(id, text, token);
      setIdea((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), res.comment],
        commentCount: res.commentCount,
      }));
      setCommentText("");
    } catch (e) {
      Alert.alert("Error", e.message || "Could not post comment.");
    } finally {
      setPosting(false);
    }
  };

  const onDelete = () => {
    Alert.alert("Delete idea", "Are you sure you want to delete this idea?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteIdea(id, token);
            router.back();
          } catch (e) {
            Alert.alert("Error", e.message || "Could not delete.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator color="#FFD700" />
      </View>
    );
  }

  if (error || !idea) {
    return (
      <View style={[styles.screen, styles.center]}>
        <StatusBar style="light" />
        <Text style={styles.errTxt}>{error || "Idea not found."}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkTxt}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const side = SIDE_META[idea.side] || SIDE_META.neutral;
  const isMine = user && idea.author && String(user.id) === String(idea.author.id);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.circleBtn}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {idea.symbol}
        </Text>
        {isMine ? (
          <TouchableOpacity onPress={onDelete} style={styles.delBtn}>
            <Ionicons name="trash-outline" size={18} color="#EA3943" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* header row */}
          <View style={styles.headRow}>
            <View style={[styles.sideChip, { backgroundColor: side.color }]}>
              <Ionicons name={side.icon} size={13} color="#0D0D0D" />
              <Text style={styles.sideChipTxt}>{side.label}</Text>
            </View>
            <Text style={styles.symbolBig}>
              {idea.symbol}
              {idea.companyName ? `  ·  ${idea.companyName}` : ""}
            </Text>
          </View>

          <Text style={styles.title}>{idea.title}</Text>

          {/* live chart */}
          <View style={styles.chartCard}>
            <StockCandleChart chart={chart} loading={chartLoading} rangeKey="1M" />
          </View>

          {/* author + boost */}
          <View style={styles.authorRow}>
            <View style={styles.author}>
              {idea.author?.avatar ? (
                <Image source={{ uri: idea.author.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>
                    {(idea.author?.name || "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.authorName}>{idea.author?.name || "Unknown"}</Text>
                <Text style={styles.time}>{timeAgo(idea.createdAt)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.boostBtn, boosted && styles.boostBtnOn]}
              onPress={onBoost}
            >
              <Ionicons name="rocket" size={15} color={boosted ? "#0D0D0D" : "#FFD700"} />
              <Text style={[styles.boostTxt, boosted && styles.boostTxtOn]}>
                {boostCount}
              </Text>
            </TouchableOpacity>
          </View>

          {!!idea.body && <Text style={styles.body}>{idea.body}</Text>}

          {/* comments */}
          <Text style={styles.commentsTitle}>
            Comments ({idea.commentCount || 0})
          </Text>
          {(idea.comments || []).length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Start the discussion.</Text>
          ) : (
            (idea.comments || []).map((c) => (
              <View key={c.id} style={styles.comment}>
                <View style={styles.cAvatar}>
                  <Text style={styles.avatarLetter}>
                    {(c.author?.name || "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cHead}>
                    <Text style={styles.cName}>{c.author?.name || "Unknown"}</Text>
                    <Text style={styles.cTime}>{timeAgo(c.createdAt)}</Text>
                  </View>
                  <Text style={styles.cText}>{c.text}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* comment input */}
        <View style={styles.inputBar}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={token ? "Add a comment…" : "Log in to comment"}
            placeholderTextColor="#6b7280"
            style={styles.commentInput}
            editable={!!token}
            onFocus={() => !token && router.push("/profile")}
          />
          <TouchableOpacity
            onPress={onComment}
            disabled={!commentText.trim() || posting}
            style={[
              styles.sendBtn,
              (!commentText.trim() || posting) && { opacity: 0.4 },
            ]}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#0D0D0D" />
            ) : (
              <Ionicons name="send" size={18} color="#0D0D0D" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 60 },
  center: { justifyContent: "center", alignItems: "center" },
  errTxt: { color: "#9aa0a6", fontSize: 14 },
  backLink: { marginTop: 12 },
  backLinkTxt: { color: "#FFD700", fontSize: 14, fontWeight: "600" },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  topTitle: { color: "#e8eaed", fontSize: 18, fontWeight: "700", flex: 1 },
  delBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  sideChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sideChipTxt: { color: "#0D0D0D", fontWeight: "800", fontSize: 12 },
  symbolBig: { color: "#9aa0a6", fontSize: 13, fontWeight: "600", flex: 1 },
  title: { color: "#e8eaed", fontSize: 20, fontWeight: "800", lineHeight: 26, marginBottom: 14 },
  chartCard: {
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    paddingVertical: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  author: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#FFD700", fontWeight: "700", fontSize: 14 },
  authorName: { color: "#e8eaed", fontSize: 14, fontWeight: "700" },
  time: { color: "#6b7280", fontSize: 12, marginTop: 1 },
  boostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  boostBtnOn: { backgroundColor: "#FFD700" },
  boostTxt: { color: "#FFD700", fontSize: 13, fontWeight: "700" },
  boostTxtOn: { color: "#0D0D0D" },
  body: { color: "#cfd2d6", fontSize: 14, lineHeight: 21, marginBottom: 20 },
  commentsTitle: {
    color: "#e8eaed",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 12,
  },
  noComments: { color: "#6b7280", fontSize: 13, marginBottom: 10 },
  comment: { flexDirection: "row", gap: 10, marginBottom: 16 },
  cAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
  },
  cHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  cName: { color: "#e8eaed", fontSize: 13, fontWeight: "700" },
  cTime: { color: "#6b7280", fontSize: 11 },
  cText: { color: "#cfd2d6", fontSize: 13, lineHeight: 19, marginTop: 2 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    backgroundColor: "#0D0D0D",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#e8eaed",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#262626",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFD700",
    alignItems: "center",
    justifyContent: "center",
  },
});
