import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback } from "react";
import { ScrollView, StyleSheet, Text, View, RefreshControl } from "react-native";
import ActionRow from "../../components/ActionRow";
import EventsList from "../../components/EventsList";
import HomeHeader from "../../components/HomeHeader";
import PromoCard from "../../components/PromoCard";
import SegmentTabs from "../../components/SegmentTabs";
import StockRow from "../../components/StockRow";
import Loader from "../../components/Loader";
import SkeletonLoader from "../../components/SkeletonLoader";
import { fetchProfile } from "../../data/profile";
import { fetchNews } from "../../data/news";
import { fetchAllStocks } from "../../data/stocks";

import engro from "../../assets/images/stock-logos/engro.png";
import lucky from "../../assets/images/stock-logos/lucky.png";
import ogdc from "../../assets/images/stock-logos/odgc.png";
import meezan from "../../assets/images/stock-logos/meezan.png";

import { useAuth } from "../../context/AuthContext";

const GAINERS = [
  {
    logo: "engrofertilizers.com",
    name: "Engro Fertilizers",
    ticker: "EFERT",
    price: "295.40",
    vol: "6.2M",
  },
  {
    logo: "lucky-cement.com",
    name: "Lucky Cement",
    ticker: "LUCK",
    price: "720.10",
    vol: "1.8M",
  },
  {
    logo: "ogdcl.com",
    name: "Oil & Gas Development Company",
    ticker: "OGDC",
    price: "142.75",
    vol: "12.4M",
  },
  {
    logo: "meezanbank.com",
    name: "Meezan Bank",
    ticker: "MEBL",
    price: "215.60",
    vol: "3.1M",
  },
];

export default function Home() {
  const [topTab, setTopTab] = useState("Watchlist");
  const [subTab, setSubTab] = useState("Spot");
  const [newsItems, setNewsItems] = useState([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [allStocks, setAllStocks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();
  const { user, token } = useAuth();

  useEffect(() => {
    fetchProfile(token, router)
      .then((data) => setAuthenticated(true))
      .catch((error) => {
        console.error("Error fetching profile:", error);
      });
    setProfileLoading(false);
  }, [token]);

  async function load() {
    const data = await fetchNews(token);
    setNewsItems(data);
    setNewsLoading(false);
  }

  const loadStocks = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchAllStocks(token);
      if (Array.isArray(data)) setAllStocks(data);
    } catch (err) {
      console.error("Stock list fetch failed:", err);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.allSettled([load(), loadStocks()]);
    setTimeout(() => setRefreshing(false), 2000);
  }, [loadStocks]);

  // console.log(newsItems);

  return (
    <>
      {authenticated && !newsLoading && !profileLoading ? (
        <View style={styles.screen}>
          <StatusBar style="light" />
          <ScrollView
            contentContainerStyle={{ paddingBottom: 28 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFD700"
              />
            }
          >
            <HomeHeader user={user} stocks={allStocks} />

            {/* Onboarding banner (Bybit "Verify Now" → Stock KYC) */}
            {/* <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            Verify your identity to start trading.
          </Text>
          <Text style={styles.bannerCta}>Verify Now</Text>
        </View> */}

            <ActionRow />

            <Text style={styles.welcomeText}>
              Welcome back,
              <Text style={styles.userName}> {user?.name || "Guest"} </Text>
            </Text>

            <PromoCard title="Enjoy Your Financial Literacy With Us" />

            {/* Two promo chips row */}
            {/* <View style={styles.cardRow}>
          <View style={styles.smallCard}>
            <Text style={styles.smallTitle}>Referral Bonus</Text>
            <Text style={styles.smallSub}>Earn 50 per friend</Text>
          </View>
          <View style={styles.smallCard}>
            <Text style={styles.smallTitle}>IPO Watch</Text>
            <Text style={styles.smallSub}>New listings this week</Text>
          </View>
        </View> */}

            {/* Tabs like Bybit (top + sub) */}

            {/* Stock list (gainers sample) */}
            <View style={styles.listCard}>
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: "#e8eaed", fontWeight: "800" }}>
                  KMI 30
                </Text>
                <Text style={{ color: "#9aa0a6", fontWeight: "700" }}>
                  {" "}
                  Stocks
                </Text>
              </View>
              {GAINERS.map((s) => (
                <StockRow key={s.ticker} {...s} />
              ))}
              <Text onPress={() => router.push("/stocks")} style={styles.more}>
                More{" "}
                <Ionicons name="chevron-forward" size={12} color="#e8eaed" />
              </Text>
            </View>

            {newsLoading ? (
              <Loader height={70} />
            ) : (
              <EventsList items={newsItems} />
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.screen}>
          <StatusBar style="light" />
          <SkeletonLoader />
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
  screen: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 40 },
  banner: {
    backgroundColor: "#141414",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
  },
  welcomeText: {
    color: "#e8eaed",
    fontSize: 22,
    fontWeight: "600",
    paddingHorizontal: 24,
    paddingVertical: 15,
    letterSpacing: 0.5,
  },

  userName: {
    color: "#FFD700", // Bybit accent color
    fontWeight: "700",
    fontSize: 24,
  },

  bannerTitle: {
    color: "#e8eaed",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  bannerCta: {
    backgroundColor: "#FFB000",
    alignSelf: "flex-start",
    color: "#141414",
    fontWeight: "800",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cardRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  smallCard: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 14,
  },
  smallTitle: { color: "#e8eaed", fontWeight: "700" },
  smallSub: { color: "#9aa0a6", marginTop: 6 },
  listCard: {
    backgroundColor: "#141414",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 4,
  },
  more: { color: "#e8eaed", alignSelf: "center", marginVertical: 12 },
});
