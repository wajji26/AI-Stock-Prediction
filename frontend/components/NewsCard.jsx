import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

export default function NewsCard({ item }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(`/news/${item.id}`)}
      style={styles.row}
    >
      {/* LEFT CONTENT */}
      <View style={styles.left}>
        <Text numberOfLines={2} style={styles.title}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.date}>{item.date}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Ongoing</Text>
          </View>
        </View>
      </View>

      {/* IMAGE */}
      <Image source={{ uri: item.image }} style={styles.thumb} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  left: { flex: 1, paddingRight: 10 },
  title: {
    color: "#e8eaed",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 10,
  },
  metaRow: { flexDirection: "row", alignItems: "center" },
  date: { color: "#9aa0a6", fontSize: 11 },
  badge: {
    backgroundColor: "#163D2B",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 10,
  },
  badgeText: { color: "#16C784", fontSize: 11, fontWeight: "700" },
  thumb: {
    width: 95,
    height: 65,
    borderRadius: 12,
  },
});
