import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

const EMOJI_OPTIONS = [
  "🎧", "🎵", "🎶", "🎸", "🎹", "🎤", "🥁", "🎷",
  "🎺", "🎻", "💿", "📀", "📻", "🔊", "🎙️", "🎼",
  "🎸", "🪕", "🪗", "🪘", "🎚️", "🎛️", "🫧", "🎧",
  "🌙", "⭐", "🔥", "💜", "🖤", "🤍", "❤️", "💚",
];

const GENRE_OPTIONS = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Jazz", "Classical",
  "Electronic", "Country", "Reggae", "Metal", "Folk", "Indie",
  "Latin", "Blues", "Punk", "Soul", "Funk", "Ambient",
  "Bollywood", "K-Pop", "Lo-Fi", "Alternative", "Other",
];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [favoriteGenre, setFavoriteGenre] = useState(user?.favoriteGenre || "");
  const [avatarEmoji, setAvatarEmoji] = useState(user?.avatarEmoji || "🎧");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGenrePicker, setShowGenrePicker] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get("/profile/stats");
      setStats(data.stats);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      setName(user?.name || "");
      setBio(user?.bio || "");
      setFavoriteGenre(user?.favoriteGenre || "");
      setAvatarEmoji(user?.avatarEmoji || "🎧");
    }, [user])
  );

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to upload an avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      const asset = result.assets[0];
      formData.append("avatar", {
        uri: asset.uri,
        type: "image/jpeg",
        name: "avatar.jpg",
      });

      const token = await import("../config/api").then((m) => m.getToken());
      const response = await fetch(`${api.defaults.baseURL}/profile/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Upload failed");

      await refreshUser();
      Alert.alert("Avatar updated!");
      loadStats();
    } catch (err) {
      Alert.alert("Upload failed", err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert("Name too short", "Name must be at least 2 characters.");
      return;
    }

    setSaving(true);
    try {
      await api.put("/profile/update", {
        name: name.trim(),
        bio: bio.trim(),
        favoriteGenre,
        avatarEmoji,
      });
      await refreshUser();
      setEditing(false);
      Alert.alert("Profile updated!");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            {uploadingAvatar ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.cameraIcon}>📷</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowEmojiPicker(true)}>
          <Text style={styles.changeEmojiBtn}>Change Emoji</Text>
        </TouchableOpacity>
      </View>

      {editing ? (
        <View style={styles.editSection}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={200}
            placeholder="Tell the room about your music taste..."
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Favorite Genre</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowGenrePicker(true)}
          >
            <Text style={{ color: favoriteGenre ? "#fff" : colors.textSecondary, fontSize: 15 }}>
              {favoriteGenre || "Select genre..."}
            </Text>
          </TouchableOpacity>

          <View style={styles.editBtns}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.infoSection}>
          <Text style={styles.profileName}>{user?.name}</Text>
          {user?.bio ? <Text style={styles.profileBio}>{user.bio}</Text> : null}
          {user?.favoriteGenre ? (
            <View style={styles.genreBadge}>
              <Text style={styles.genreText}>{user.favoriteGenre}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {stats && (
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <StatBox label="Total Points" value={stats.totalPoints} icon="⭐" />
            <StatBox label="Best Streak" value={stats.bestStreak} icon="🔥" />
            <StatBox label="Songs Dropped" value={stats.songsSubmitted} icon="🎵" />
            <StatBox label="Songs Listened" value={stats.songsCompleted} icon="🎧" />
            <StatBox label="Ratings Given" value={stats.ratingsGiven} icon="📊" />
            <StatBox label="5★ Curations" value={stats.fiveStarCurations} icon="💎" />
            <StatBox label="Groups" value={stats.groupsCount} icon="👥" />
            <StatBox label="Avg Rating" value={stats.avgRating || "—"} icon="📈" />
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>

      <Modal visible={showEmojiPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Emoji</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={EMOJI_OPTIONS}
              numColumns={8}
              keyExtractor={(item, i) => `${item}-${i}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.emojiItem, avatarEmoji === item && styles.emojiItemActive]}
                  onPress={() => {
                    setAvatarEmoji(item);
                    setShowEmojiPicker(false);
                    if (!editing) {
                      api.put("/profile/update", { avatarEmoji: item }).then(() => refreshUser()).catch(() => {});
                    }
                  }}
                >
                  <Text style={styles.emojiText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showGenrePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Genre</Text>
              <TouchableOpacity onPress={() => setShowGenrePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={GENRE_OPTIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.genreItem, favoriteGenre === item && styles.genreItemActive]}
                  onPress={() => {
                    setFavoriteGenre(item);
                    setShowGenrePicker(false);
                  }}
                >
                  <Text style={[styles.genreItemText, favoriteGenre === item && styles.genreItemTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StatBox({ label, value, icon }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 20 },

  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surfaceBorder },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 44 },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.background,
  },
  cameraIcon: { fontSize: 14 },
  changeEmojiBtn: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: 8 },

  infoSection: { alignItems: "center", marginBottom: 24 },
  profileName: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  profileBio: { color: colors.textSecondary, fontSize: 14, textAlign: "center", marginBottom: 8, lineHeight: 20 },
  genreBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  genreText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  editBtn: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  editSection: { marginBottom: 24 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  editBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cancelBtnText: { color: colors.textSecondary, fontWeight: "700", fontSize: 14 },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: colors.background, fontWeight: "800", fontSize: 14 },

  statsSection: { marginTop: 8 },
  statsTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statBox: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  logoutBtn: {
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.25)",
  },
  logoutBtnText: { color: "#F87171", fontWeight: "800", fontSize: 15 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  modalClose: { color: colors.textSecondary, fontSize: 20 },
  emojiItem: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    margin: 2,
  },
  emojiItemActive: {     backgroundColor: "rgba(34, 197, 94, 0.2)" },
  emojiText: { fontSize: 26 },
  genreItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: colors.surfaceBorder,
  },
  genreItemActive: { backgroundColor: colors.primary },
  genreItemText: { color: "#D1D0DB", fontSize: 15, fontWeight: "600" },
  genreItemTextActive: { color: colors.background },
});
