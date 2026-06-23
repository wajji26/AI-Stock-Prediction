import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// PSX brokers shown on the stock detail page. Each opens its official site.
const BROKERS = [
  {
    name: "KTrade",
    logo: require("../assets/images/ktrade.jpg"),
    category: "PSX Equities",
    rating: 4.7,
    featured: true,
    url: "https://www.kasb.com",
  },
  {
    name: "Arif Habib Limited",
    logo: require("../assets/images/arifhabib.png"),
    category: "Equities, Research",
    rating: 4.6,
    featured: false,
    url: "https://www.arifhabibltd.com",
  },
  {
    name: "SCS Trade",
    logo: require("../assets/images/scs.jpg"),
    category: "Online Trading",
    rating: 4.4,
    featured: false,
    url: "https://www.scstrade.com",
  },
  {
    name: "Foundation Securities",
    logo: require("../assets/images/foundation.jpeg"),
    category: "Brokerage, Advisory",
    rating: 4.5,
    featured: false,
    url: "https://www.fs.com.pk",
  },
];

function Stars({ rating }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const name =
      rating >= i ? "star" : rating >= i - 0.5 ? "star-half" : "star-outline";
    stars.push(
      <Ionicons key={i} name={name} size={13} color="#FFD700" />,
    );
  }
  return <View style={styles.starsRow}>{stars}</View>;
}

export default function Brokers() {
  const openBroker = (url) => {
    Linking.openURL(url).catch((e) => console.log("Failed to open broker:", e));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Made to trade</Text>
      <Text style={styles.subheading}>Trusted PSX brokers</Text>

      {BROKERS.map((b) => (
        <View key={b.name} style={styles.brokerCard}>
          {b.featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>FEATURED</Text>
            </View>
          )}

          <View style={styles.brokerRow}>
            <Image source={b.logo} style={styles.logo} resizeMode="contain" />

            <View style={styles.brokerInfo}>
              <Text style={styles.brokerName}>{b.name}</Text>
              <Text style={styles.brokerCategory}>{b.category}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingText}>{b.rating.toFixed(1)}</Text>
                <Stars rating={b.rating} />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.openBtn}
            onPress={() => openBroker(b.url)}
            activeOpacity={0.85}
          >
            <Text style={styles.openBtnText}>Open account</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 20,
  },
  heading: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
  },
  subheading: {
    color: "#8B96A5",
    fontSize: 14,
    marginTop: 2,
    marginBottom: 16,
  },
  brokerCard: {
    backgroundColor: "#101014",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1c1f24",
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  featuredText: {
    color: "#0D0D0D",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  brokerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: "#fff",
  },
  brokerInfo: {
    flex: 1,
  },
  brokerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  brokerCategory: {
    color: "#8B96A5",
    fontSize: 13,
    marginTop: 3,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  ratingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 8,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  openBtn: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  openBtnText: {
    color: "#0D0D0D",
    fontSize: 15,
    fontWeight: "700",
  },
});
