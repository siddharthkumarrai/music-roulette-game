import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";

function getTimeRemaining(deadlineHour, timezone) {
  const now = new Date();
  const options = { timeZone: timezone, hour: "numeric", minute: "numeric", hour12: false };
  const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour").value);
  const minute = parseInt(parts.find((p) => p.type === "minute").value);

  let hoursLeft = deadlineHour - hour - 1;
  let minutesLeft = 60 - minute;

  if (hoursLeft < 0) {
    hoursLeft += 24;
  }
  if (minutesLeft === 60) {
    minutesLeft = 0;
    hoursLeft += 1;
  }
  if (hoursLeft < 0) hoursLeft += 24;

  return { hours: hoursLeft, minutes: minutesLeft };
}

function getFormattedDate(timezone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

export default function RoomScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [link, setLink] = useState("");
  const [quest, setQuest] = useState([]);
  const [mySong, setMySong] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [group, setGroup] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0 });
  const [submittedVideoId, setSubmittedVideoId] = useState(null);
  const metaRefreshTimer = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [questRes, groupRes] = await Promise.all([
        api.get(`/groups/${groupId}/songs/today`),
        api.get(`/groups/${groupId}`),
      ]);
      setMySong(questRes.data.mySong);
      setQuest(questRes.data.quest);
      setGroup(groupRes.data.group);
      const me = groupRes.data.group.members.find((m) => m.user._id === user.id);
      setMyStats(me);
    } catch (err) {
      Alert.alert("Couldn't load room", err.message);
    } finally {
      setRefreshing(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (!group) return;
    const update = () => setTimeLeft(getTimeRemaining(group.settings.dailyDeadlineHour, group.settings.timezone));
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [group]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSubmit = async () => {
    if (!link.trim()) {
      Alert.alert("Paste a link", "Add a YouTube link for your Song of the Day.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/groups/${groupId}/songs`, { url: link.trim() }, { timeout: 10000 });
      if (data.isLate) {
        Alert.alert("Dropped late", "This counts as a late drop — deadline already passed today.");
      }
      setLink("");
      setSubmittedVideoId(data.song.youtubeVideoId);
      loadData();
      if (metaRefreshTimer.current) clearInterval(metaRefreshTimer.current);
      metaRefreshTimer.current = setInterval(() => {
        loadData();
      }, 8000);
      setTimeout(() => {
        if (metaRefreshTimer.current) {
          clearInterval(metaRefreshTimer.current);
          metaRefreshTimer.current = null;
        }
      }, 60000);
    } catch (err) {
      Alert.alert("Couldn't submit", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const useBusyPass = async () => {
    Alert.alert(
      "Use Busy Pass?",
      "Skips today with 0 points but keeps your streak alive.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use it",
          onPress: async () => {
            try {
              await api.post(`/groups/${groupId}/logs/busy-pass`);
              Alert.alert("Busy pass used", "See you tomorrow 🎧");
              loadData();
            } catch (err) {
              Alert.alert("Couldn't use pass", err.message);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    return () => {
      if (metaRefreshTimer.current) clearInterval(metaRefreshTimer.current);
    };
  }, []);

  if (!group) return null;

  const completedCount = quest.filter((q) => q.myLog?.status === "completed").length;
  const timezone = group.settings.timezone;
  const todayDate = getFormattedDate(timezone);
  const isPastDeadline = timeLeft.hours === 0 && timeLeft.minutes === 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={quest}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B98CFF" />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.roomName} numberOfLines={1} ellipsizeMode="tail">
                {groupName}
              </Text>
              <View style={styles.headerLinks}>
                <TouchableOpacity onPress={() => navigation.navigate("RoomRules", { groupId })}>
                  <Text style={styles.linkBtn}>Rules</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate("Playlists", { groupId })}>
                  <Text style={styles.linkBtn}>Playlists</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate("RoomSettings", { groupId })}>
                  <Text style={styles.linkBtnDim}>Settings</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{group.members.length} members</Text>
              </View>
              <View style={[styles.infoBadge, isPastDeadline && styles.infoBadgeWarn]}>
                <Text style={[styles.infoBadgeText, isPastDeadline && styles.infoBadgeTextWarn]}>
                  {isPastDeadline ? "Deadline passed" : `${timeLeft.hours}h ${timeLeft.minutes}m left`}
                </Text>
              </View>
            </View>

            <Text style={styles.dateText}>{todayDate}</Text>

            {myStats?.role === "owner" && (
              <TouchableOpacity
                style={styles.deleteRoomBtn}
                onPress={() => {
                  Alert.alert(
                    "Delete this room?",
                    "This will permanently delete the room, all songs, and all listening logs. This cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete Room",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await api.delete(`/groups/${groupId}`);
                            Alert.alert("Room deleted", "The room has been removed.");
                            navigation.navigate("Rooms");
                          } catch (err) {
                            Alert.alert("Error", err.message);
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.deleteRoomText}>Delete Room</Text>
              </TouchableOpacity>
            )}

            {myStats && (
              <View style={styles.statsRow}>
                <Stat label="Points" value={myStats.totalPoints} />
                <Stat label="Streak" value={myStats.streakCount} icon="🔥" />
                <Stat label="Passes" value={myStats.busyPassesLeft} icon="🛌" />
              </View>
            )}

            <Text style={styles.sectionTitle}>Your Song of the Day</Text>
            {mySong ? (
              <View style={styles.submittedCard}>
                <View style={styles.submittedRow}>
                  {mySong.thumbnailUrl ? (
                    <Image source={{ uri: mySong.thumbnailUrl }} style={styles.submittedThumb} />
                  ) : (
                    <View style={[styles.submittedThumb, { alignItems: "center", justifyContent: "center" }]}>
                      <Text style={{ fontSize: 18 }}>🎵</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.submittedText}>✅ Dropped</Text>
                    <Text style={styles.submittedTitle} numberOfLines={2}>
                      {mySong.title || mySong.youtubeVideoId}
                    </Text>
                  </View>
                </View>
                {!mySong.streamReady && !mySong.audioUrl ? (
                  <View style={styles.processingRow}>
                    <ActivityIndicator color="#B98CFF" size="small" />
                    <Text style={styles.processingText}>Processing audio...</Text>
                  </View>
                ) : (
                  <Text style={styles.submittedSub}>Waiting for the room to listen...</Text>
                )}
              </View>
            ) : (
              <View style={styles.submitBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Paste YouTube link..."
                  placeholderTextColor="#6E6A80"
                  value={link}
                  onChangeText={setLink}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                  <Text style={styles.submitBtnText}>{submitting ? "..." : "Drop"}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.questHeaderRow}>
              <Text style={styles.sectionTitle}>Today's Listening Quest</Text>
              <Text style={styles.questProgress}>
                {completedCount}/{quest.length}
              </Text>
            </View>
          </>
        }
        keyExtractor={(item) => item.song._id}
        renderItem={({ item }) => {
          const status = item.myLog?.status || "pending";
          return (
            <TouchableOpacity
              style={styles.questCard}
              onPress={() => navigation.navigate("MusicPlayer", { groupId, song: item.song, myLog: item.myLog })}
            >
              {item.song.thumbnailUrl ? (
                <Image source={{ uri: item.song.thumbnailUrl }} style={styles.questThumb} />
              ) : (
                <View style={[styles.questThumb, styles.questThumbPlaceholder]}>
                  <Text style={{ fontSize: 16 }}>🎵</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.questSong} numberOfLines={1} ellipsizeMode="tail">
                  {item.song.title || item.song.youtubeVideoId}
                </Text>
                <Text style={styles.questVideo}>{item.song.user.name}'s pick</Text>
              </View>
              <StatusBadge status={status} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No songs from the room yet today.</Text>
        }
        ListFooterComponent={
          <>
            <TouchableOpacity style={styles.busyPassBtn} onPress={useBusyPass}>
              <Text style={styles.busyPassText}>Use Busy Pass for Today</Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </>
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.bottomBarItem}
          onPress={() => navigation.navigate("RoomRules", { groupId })}
        >
          <Text style={styles.bottomBarIcon}>📖</Text>
          <Text style={styles.bottomBarLabel}>Rules</Text>
        </TouchableOpacity>
        <View style={styles.bottomBarDivider} />
        <TouchableOpacity
          style={styles.bottomBarItem}
          onPress={() => navigation.navigate("Playlists", { groupId })}
        >
          <Text style={styles.bottomBarIcon}>🎶</Text>
          <Text style={styles.bottomBarLabel}>Playlists</Text>
        </TouchableOpacity>
        <View style={styles.bottomBarDivider} />
        <TouchableOpacity
          style={styles.bottomBarItem}
          onPress={() => navigation.navigate("Leaderboard", { groupId })}
        >
          <Text style={styles.bottomBarIcon}>🏆</Text>
          <Text style={styles.bottomBarLabel}>Leaderboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Stat({ label, value, icon }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{icon ? `${icon} ` : ""}{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: { text: "Done", color: "#4ADE80", bg: "rgba(74, 222, 128, 0.12)" },
    pending: { text: "Pending", color: "#FBBF24", bg: "rgba(251, 191, 36, 0.12)" },
    skipped: { text: "Skipped", color: "#F87171", bg: "rgba(248, 113, 113, 0.12)" },
  };
  const s = map[status] || map.pending;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#12111A" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roomName: { fontSize: 22, fontWeight: "800", color: "#fff", flex: 1, marginRight: 8 },
  headerLinks: { flexDirection: "row", gap: 10, alignItems: "center", flexShrink: 0 },
  linkBtn: { color: "#B98CFF", fontWeight: "700", fontSize: 13 },
  linkBtnDim: { color: "#6E6A80", fontWeight: "600", fontSize: 13 },

  infoRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  infoBadge: {
    backgroundColor: "#1E1C2A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  infoBadgeWarn: { borderColor: "#F87171", backgroundColor: "rgba(248, 113, 113, 0.08)" },
  infoBadgeText: { color: "#9C97AE", fontSize: 12, fontWeight: "600" },
  infoBadgeTextWarn: { color: "#F87171" },

  dateText: { color: "#6E6A80", fontSize: 12, marginBottom: 16 },

  deleteRoomBtn: {
    borderWidth: 1,
    borderColor: "#F87171",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  deleteRoomText: { color: "#F87171", fontSize: 12, fontWeight: "700" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: "#1E1C2A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "#9C97AE", fontSize: 11, marginTop: 2 },

  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 10 },

  submitBox: { flexDirection: "row", gap: 8, marginBottom: 24 },
  input: {
    flex: 1,
    backgroundColor: "#1E1C2A",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#fff",
    height: 46,
    borderWidth: 1,
    borderColor: "#2E2B3E",
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: "#B98CFF",
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  submitBtnText: { color: "#12111A", fontWeight: "800", fontSize: 14 },

  submittedCard: {
    backgroundColor: "#1E1C2A",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  submittedRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  submittedThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#2E2B3E",
    marginRight: 12,
  },
  submittedText: { color: "#4ADE80", fontWeight: "700", fontSize: 13 },
  submittedTitle: { color: "#fff", fontWeight: "600", fontSize: 14, marginTop: 4 },
  submittedSub: { color: "#9C97AE", fontSize: 12, marginTop: 10 },
  processingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  processingText: { color: "#B98CFF", fontSize: 12, fontWeight: "600" },

  questHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  questProgress: { color: "#B98CFF", fontWeight: "700", fontSize: 14 },

  questCard: {
    backgroundColor: "#1E1C2A",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  questThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#2E2B3E",
    marginRight: 12,
  },
  questThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  questSong: { color: "#fff", fontWeight: "600", fontSize: 14 },
  questVideo: { color: "#6E6A80", fontSize: 12, marginTop: 2 },

  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  badgeText: { fontWeight: "700", fontSize: 12 },

  empty: { color: "#6E6A80", textAlign: "center", marginVertical: 24, fontSize: 14 },
  busyPassBtn: { marginTop: 8, alignItems: "center", padding: 12 },
  busyPassText: { color: "#6E6A80", fontSize: 13 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A1828",
    borderTopWidth: 1,
    borderTopColor: "#2E2B3E",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  bottomBarItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  bottomBarIcon: { fontSize: 20, marginBottom: 2 },
  bottomBarLabel: { color: "#9C97AE", fontSize: 11, fontWeight: "600" },
  bottomBarDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#2E2B3E",
  },
});
