import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { boostIdea, timeAgo } from "../../data/community";
import MiniChart from "./MiniChart";

const SIDE_META = {
  long: { label: "Long", color: "#16C784", icon: "trending-up" },
  short: { label: "Short", color: "#EA3943", icon: "trending-down" },
  neutral: { label: "Idea", color: "#FFD700", icon: "remove" },
};

export default function IdeaCard({ idea, cardWidth, onAuthRequired }) {
  const { token } = useAuth();
  const [boosted, setBoosted] = useState(!!idea.boostedByMe);
  const [boostCount, setBoostCount] = useState(idea.boostCount || 0);
  const [busy, setBusy] = useState(false);

  const side = SIDE_META[idea.side] || SIDE_META.neutral;

  const open = () => router.push(`/community/${idea.id}`);

  const onBoost = async () => {
    if (!token) return onAuthRequired?.();
    if (busy) return;
    setBusy(true);
    // optimistic
    const nextBoosted = !boosted;
    setBoosted(nextBoosted);
    setBoostCount((c) => c + (nextBoosted ? 1 : -1));
    try {
      const res = await boostIdea(idea.id, token);
      setBoosted(res.boosted);
      setBoostCount(res.boostCount);
    } catch {
      // revert on failure
      setBoosted(boosted);
      setBoostCount(idea.boostCount || 0);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={open} style={styles.card}>
      {/* chart thumbnail */}
      <View style={styles.chartWrap}>
        <MiniChart
          symbol={idea.symbol}
          side={idea.side}
          width={cardWidth - 2}
          height={130}
        />
        <View style={styles.symbolBadge}>
          <Text style={styles.symbolTxt}>{idea.symbol}</Text>
        </View>
        <View style={[styles.sideBadge, { backgroundColor: side.color }]}>
          <Ionicons name={side.icon} size={12} color="#0D0D0D" />
          <Text style={styles.sideTxt}>{side.label}</Text>
        </View>
        {idea.editorsPick && (
          <View style={styles.pickBadge}>
            <Ionicons name="ribbon" size={11} color="#0D0D0D" />
          </View>
        )}
      </View>

      {/* body */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {idea.title}
        </Text>
        {!!idea.body && (
          <Text style={styles.snippet} numberOfLines={2}>
            {idea.body}
          </Text>
        )}

        {/* footer */}
        <View style={styles.footer}>
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
              <Text style={styles.authorName} numberOfLines={1}>
                by {idea.author?.name || "Unknown"}
              </Text>
              <Text style={styles.time}>{timeAgo(idea.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Ionicons name="chatbubble-outline" size={14} color="#9aa0a6" />
              <Text style={styles.statTxt}>{idea.commentCount || 0}</Text>
            </View>
            <TouchableOpacity
              style={[styles.boostBtn, boosted && styles.boostBtnOn]}
              onPress={onBoost}
              hitSlop={8}
            >
              <Ionicons
                name="rocket"
                size={14}
                color={boosted ? "#0D0D0D" : "#FFD700"}
              />
              <Text style={[styles.boostTxt, boosted && styles.boostTxtOn]}>
                {boostCount}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    overflow: "hidden",
    marginBottom: 16,
  },
  chartWrap: {
    height: 130,
    backgroundColor: "#0F0F0F",
    justifyContent: "center",
  },
  symbolBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  symbolTxt: { color: "#fff", fontSize: 12, fontWeight: "800" },
  sideBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sideTxt: { color: "#0D0D0D", fontSize: 11, fontWeight: "800" },
  pickBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#FFD700",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 14 },
  title: { color: "#e8eaed", fontSize: 15, fontWeight: "700", lineHeight: 20 },
  snippet: { color: "#9aa0a6", fontSize: 12, marginTop: 6, lineHeight: 17 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  author: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  avatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#FFD700", fontWeight: "700", fontSize: 13 },
  authorName: { color: "#e8eaed", fontSize: 12, fontWeight: "600", maxWidth: 120 },
  time: { color: "#6b7280", fontSize: 11, marginTop: 1 },
  stats: { flexDirection: "row", alignItems: "center", gap: 12 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statTxt: { color: "#9aa0a6", fontSize: 12, fontWeight: "600" },
  boostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  boostBtnOn: { backgroundColor: "#FFD700" },
  boostTxt: { color: "#FFD700", fontSize: 12, fontWeight: "700" },
  boostTxtOn: { color: "#0D0D0D" },
});
