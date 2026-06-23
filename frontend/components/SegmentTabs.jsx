import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SegmentTabs({ tabs, active, onChange }) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => onChange(t)}
            style={[styles.tab, active === t && styles.active]}
          >
            <Text style={[styles.txt, active === t && styles.activeTxt]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { marginTop: 16, paddingHorizontal: 12 },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: "#141414",
  },
  active: {
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#303030",
  },
  txt: { color: "#9aa0a6", fontSize: 13 },
  activeTxt: { color: "#e8eaed", fontWeight: "700" },
});
