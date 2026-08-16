import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../config/api";

const TABS = [
  { key: "weekly", label: "This Week" },
  { key: "monthly", label: "Monthly" },
  { key: "winners", label: "Winners" },
];

function getTimeUntilSunday(timezone) {
  const now = new Date();
  const dayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "numeric", minute: "numeric", hour12: false });
  const parts = dayFormatter.formatToParts(now);
  const day = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");

  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const today = dayMap[day] ?? 0;
  const daysLeft = today === 0 ? 0 : 7 - today;
  const hoursLeft = 23 - hour;
  const minutesLeft = 60 - minute;

  if (daysLeft === 0) return "Resets today at midnight";
  if (daysLeft === 1) return `Resets tomorrow (${hoursLeft}h ${minutesLeft}m)`;
  return `Resets in ${daysLeft} days (${daysLeft - 1}d ${hoursLeft}h)`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function LeaderboardScreen({ route }) {
  const insets = useSafeAreaInsets();
  const { groupId } = route.params;
  const [tab, setTab] = useState("weekly");
  const [leaderboard, setLeaderboard] = useState([]);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [tab])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === "winners") {
        const { data } = await api.get(`/groups/${groupId}/leaderboard/history`);
        setWinners(data.history || []);
      } else {
        const [lbRes, grpRes] = await Promise.all([
          api.get(`/groups/${groupId}/leaderboard`, { params: { period: tab } }),
          api.get(`/groups/${groupId}`),
        ]);
        setLeaderboard(lbRes.data.leaderboard);
        setGroup(grpRes.data.group);
      }
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isTiedWithPrev = (i) => {
    if (i === 0) return false;
    const a = leaderboard[i];
    const b = leaderboard[i - 1];
    return a.points === b.points && a.fiveStarCurations === b.fiveStarCurations;
  };

  const isTiedWithNext = (i) => {
    if (i >= leaderboard.length - 1) return false;
    const a = leaderboard[i];
    const b = leaderboard[i + 1];
    return a.points === b.points && a.fiveStarCurations === b.fiveStarCurations;
  };

  const getDisplayRank = (i) => {
    if (!isTiedWithPrev(i)) {
      let rank = 1;
      for (let j = 0; j < i; j++) {
        if (!isTiedWithPrev(j + 1)) rank++;
      }
      return `#${rank}`;
    }
    return getDisplayRank(i - 1);
  };

  const hasMedal = (i) => {
    if (isTiedWithPrev(i) || isTiedWithNext(i)) return false;
    const rank = parseInt(getDisplayRank(i).replace("#", ""));
    return rank <= 3;
  };

  const medal = (i) => {
    if (hasMedal(i)) {
      const rank = parseInt(getDisplayRank(i).replace("#", ""));
      return rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
    }
    return getDisplayRank(i);
  };

  const positionStyle = (i) => {
    if (isTiedWithPrev(i) || isTiedWithNext(i)) return {};
    const rank = parseInt(getDisplayRank(i).replace("#", ""));
    if (rank === 1) return { borderColor: "#FFD700", borderWidth: 2 };
    if (rank === 2) return { borderColor: "#C0C0C0", borderWidth: 2 };
    if (rank === 3) return { borderColor: "#CD7F32", borderWidth: 2 };
    return {};
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#B98CFF" size="large" />
      </View>
    );
  }

  if (tab === "winners") {
    return (
      <View style={styles.container}>
        <View style={{ paddingTop: insets.top }}>
        <Text style={styles.title}>Weekly Winners</Text>
        <Text style={styles.subtitle}>
          Most ratings received on your songs each week wins
        </Text>

        <FlatList
          data={winners}
          keyExtractor={(item) => item._id || item.weekStart}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.weekCard}>
              <View style={styles.weekHeader}>
                <Text style={styles.weekRange}>
                  {formatDate(item.weekStart)} — {formatDate(item.weekEnd)}
                </Text>
              </View>
              {item.rankings && item.rankings.length > 0 ? (
                item.rankings.map((r, i) => (
                  <View key={i} style={[styles.winnerRow, positionStyle(i)]}>
                    <Text style={styles.winnerMedal}>{medal(i)}</Text>
                    <Text style={styles.winnerAvatar}>{r.user?.avatarEmoji || "🎧"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.winnerName}>{r.user?.name || "Unknown"}</Text>
                      <Text style={styles.winnerMeta}>
                        {r.ratingsReceived} ratings · {r.songsSubmitted} songs
                      </Text>
                    </View>
                    <Text style={styles.winnerPoints}>{r.points} pts</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noData}>No rankings recorded</Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyText}>No winners yet</Text>
              <Text style={styles.emptySub}>Winners are recorded every Sunday at midnight</Text>
            </View>
          }
        />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top }}>
      <Text style={styles.title}>Leaderboard</Text>

      {group && tab === "weekly" && (
        <Text style={styles.countdown}>
          {getTimeUntilSunday(group.settings.timezone)}
        </Text>
      )}

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        renderItem={({ item, index }) => (
          <View style={[styles.row, positionStyle(index)]}>
            <Text style={styles.rank}>{medal(index)}</Text>
            <Text style={styles.avatar}>{item.avatarEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.streak}>🔥 {item.streakCount} day streak</Text>
            </View>
            <View style={styles.pointsWrap}>
              <Text style={styles.points}>{item.points}</Text>
              <Text style={styles.pointsLabel}>pts</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No scores yet — drop the first song!</Text>}
        ListFooterComponent={
          <View style={styles.footerNote}>
            <Text style={styles.footNote}>
              {tab === "weekly"
                ? "Weekly winner: player whose songs receive the most ratings. Resets Sunday."
                : "Tie-breaker: most 5★ curations, then earliest submission."}
            </Text>
          </View>
        }
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#12111A" },
  center: { flex: 1, backgroundColor: "#12111A", alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", padding: 20, paddingBottom: 4 },
  subtitle: { color: "#6E6A80", fontSize: 13, paddingHorizontal: 20, marginBottom: 12 },
  countdown: { color: "#B98CFF", fontSize: 13, fontWeight: "600", paddingHorizontal: 20, marginBottom: 12 },
  tabs: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#1E1C2A",
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  tabActive: { backgroundColor: "#B98CFF", borderColor: "#B98CFF" },
  tabText: { color: "#9C97AE", fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: "#12111A" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1C2A",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  rank: { width: 40, fontSize: 16, color: "#fff", fontWeight: "700", textAlign: "center" },
  avatar: { fontSize: 24, marginRight: 12 },
  name: { color: "#fff", fontWeight: "700", fontSize: 15 },
  streak: { color: "#9C97AE", fontSize: 12, marginTop: 2 },
  pointsWrap: { alignItems: "center" },
  points: { color: "#B98CFF", fontWeight: "800", fontSize: 18 },
  pointsLabel: { color: "#6E6A80", fontSize: 10, fontWeight: "600" },

  weekCard: {
    backgroundColor: "#1E1C2A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  weekHeader: { marginBottom: 12 },
  weekRange: { color: "#9C97AE", fontSize: 13, fontWeight: "600" },
  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#251F35",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  winnerMedal: { width: 36, fontSize: 18, color: "#fff", fontWeight: "700", textAlign: "center" },
  winnerAvatar: { fontSize: 22, marginRight: 10 },
  winnerName: { color: "#fff", fontWeight: "700", fontSize: 14 },
  winnerMeta: { color: "#9C97AE", fontSize: 11, marginTop: 2 },
  winnerPoints: { color: "#B98CFF", fontWeight: "800", fontSize: 15 },
  noData: { color: "#6E6A80", fontSize: 13, textAlign: "center", paddingVertical: 12 },

  emptyWrap: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  emptySub: { color: "#6E6A80", fontSize: 13, marginTop: 6, textAlign: "center" },

  empty: { color: "#6E6A80", textAlign: "center", marginTop: 40, fontSize: 14 },
  footerNote: { marginTop: 16 },
  footNote: { color: "#6E6A80", fontSize: 12, textAlign: "center", lineHeight: 18 },
});
