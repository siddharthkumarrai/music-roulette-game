import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

export default function RoomsListScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroups = async () => {
    try {
      const { data } = await api.get("/groups");
      setGroups(data.groups);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.hello}>Hey {user?.name} 👋</Text>
          <Text style={styles.sub}>Your listening rooms</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileBtn}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.profileAvatar} />
            ) : (
              <Text style={styles.profileEmoji}>{user?.avatarEmoji || "🎧"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.roomCard}
            onPress={() => navigation.navigate("Room", { groupId: item._id, groupName: item.name })}
            activeOpacity={0.7}
          >
            <View style={styles.roomIcon}>
              <Text style={{ fontSize: 22 }}>🎧</Text>
            </View>
            <View style={styles.roomInfo}>
              <Text style={styles.roomName} numberOfLines={1} ellipsizeMode="tail">
                {item.name}
              </Text>
              <Text style={styles.roomMeta} numberOfLines={1} ellipsizeMode="tail">
                {item.members.length} member{item.members.length !== 1 ? "s" : ""} · Code: {item.inviteCode}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎵</Text>
            <Text style={styles.emptyText}>No rooms yet</Text>
            <Text style={styles.emptySub}>Create one or join with an invite code below.</Text>
          </View>
        }
        contentContainerStyle={{
          padding: 20,
          flexGrow: 1,
          paddingBottom: 100,
        }}
      />

      <View style={[styles.footerBtns, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <TouchableOpacity
          style={[styles.footerBtn, styles.footerBtnGhost]}
          onPress={() => navigation.navigate("JoinRoom")}
          activeOpacity={0.7}
        >
          <Text style={styles.footerBtnGhostText}>Join with Code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => navigation.navigate("CreateRoom")}
          activeOpacity={0.7}
        >
          <Text style={styles.footerBtnText}>+ Create Room</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  hello: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  sub: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatar: { width: 40, height: 40, borderRadius: 20 },
  profileEmoji: { fontSize: 20 },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  roomIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  roomInfo: { flex: 1, minWidth: 0 },
  roomName: { color: "#fff", fontSize: 17, fontWeight: "700" },
  roomMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
  chevron: { color: colors.textSecondary, fontSize: 24, fontWeight: "300", marginLeft: 8 },
  empty: { alignItems: "center", marginTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  emptySub: { color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 },
  footerBtns: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  footerBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  footerBtnText: { color: colors.background, fontWeight: "800", fontSize: 15 },
  footerBtnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder },
  footerBtnGhostText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
