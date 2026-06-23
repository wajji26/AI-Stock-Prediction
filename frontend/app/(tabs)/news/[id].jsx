// app/news/detail.jsx
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { fetchNewsDetails } from "../../../data/newsPage";
import Loader from "../../../components/Loader";

const { useAuth } = require("../../../context/AuthContext");

export default function NewsDetailScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams();

  const [newsData, setNewsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewsDetails(token, id).then((data) => {
      setNewsData(data);
      setLoading(false);
    });
  }, [id]);

  return (
    <>
      {loading ? (
        <View style={styles.safe}>
          <Loader />
        </View>
      ) : (
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Market News
            </Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Image / logo */}
            <View style={styles.imageWrapper}>
              <Image source={{ uri: newsData.image }} style={styles.image} />
            </View>

            {/* Meta */}
            <View style={styles.metaRow}>
              <Text style={styles.source}>{newsData.source}</Text>
              {newsData.datetime ? (
                <>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.date}>{newsData.datetime}</Text>
                </>
              ) : null}
            </View>

            {/* Category chip */}
            {newsData.category ? (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText}>{newsData.category}</Text>
              </View>
            ) : null}

            {/* Title */}
            <Text style={styles.title}>{newsData.title}</Text>

            {/* Body */}
            <Text style={styles.body}>{newsData.text}</Text>

            {/* Open full article */}
            {newsData.url ? (
              <TouchableOpacity
                style={styles.cta}
                onPress={() => Linking.openURL(String(newsData.url))}
                activeOpacity={0.9}
              >
                <Text style={styles.ctaText}>Open full article</Text>
                <Ionicons name="arrow-forward" size={18} color="#05060A" />
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#070707",
    height: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#05060A", // Bybit-style dark
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#202332",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0D14",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  imageWrapper: {
    marginTop: 12,
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0B0D14",
    borderWidth: 1,
    borderColor: "#171B26",
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    height: "100%",
    width: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    height: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  source: {
    color: "#9FA6C0",
    fontSize: 12,
    fontWeight: "600",
  },
  dot: {
    color: "#3A3F55",
    marginHorizontal: 4,
  },
  date: {
    color: "#6D738A",
    fontSize: 12,
  },
  categoryChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#151C2D",
    marginBottom: 10,
  },
  categoryText: {
    color: "#FFD15C",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  body: {
    color: "#A4ABC8",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    marginTop: 4,
  },
  ctaText: {
    color: "#05060A",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 6,
  },
});
