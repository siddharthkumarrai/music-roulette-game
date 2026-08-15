import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  AppState,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import Constants from "expo-constants";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";
import PlaylistItem from "../components/PlaylistItem";

function formatTime(seconds) {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlaylistsScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("group");

  const [currentSong, setCurrentSong] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const soundRef = useRef(null);
  const appState = useRef(AppState.currentState);

  const loadPlaylists = useCallback(async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/songs/playlists`);
      setPlaylists(data.playlists || []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current === "active" && nextState.match(/inactive|background/)) {
        pauseAudio();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  const pauseAudio = async () => {
    if (!soundRef.current) return;
    try { await soundRef.current.pauseAsync(); } catch {}
  };

  const playSong = async (song, userId) => {
    if (currentSong?._id === song._id) {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
        return;
      }
    }

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const audioUrl = song.audioUrl || null;
    if (!audioUrl) {
      try {
        const { data } = await api.get(`/audio/${song.youtubeVideoId}/status`);
        if (data.audioUrl) {
          await loadAndPlay(data.audioUrl, song, userId);
        } else {
          Alert.alert("Not ready", "This song is still being processed. Try again in a moment.");
        }
      } catch {
        Alert.alert("Error", "Could not load audio for this song.");
      }
      return;
    }

    await loadAndPlay(audioUrl, song, userId);
  };

  const loadAndPlay = async (audioUrl, song, userId) => {
    setIsLoadingAudio(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setCurrentSong(song);
      setCurrentUserId(userId);
      setIsPlaying(true);
    } catch (err) {
      Alert.alert("Playback error", err.message);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const onPlaybackStatusUpdate = useCallback((status) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis / 1000);
    setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
    setIsPlaying(status.isPlaying);
  }, []);

  const closePlayer = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setCurrentSong(null);
    setCurrentUserId(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  };

  const myPlaylist = playlists.find((p) => p.user._id === user.id);
  const otherPlaylists = playlists.filter((p) => p.user._id !== user.id);

  const displayPlaylists = activeTab === "me"
    ? (myPlaylist ? [myPlaylist] : [])
    : otherPlaylists;

  const renderPlaylist = ({ item }) => (
    <View style={styles.playlistSection}>
      <View style={styles.playlistHeader}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarEmoji}>{item.user.avatarEmoji || "🎧"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{item.user.name}</Text>
          <Text style={styles.songCount}>{item.songs.length} song{item.songs.length !== 1 ? "s" : ""}</Text>
        </View>
      </View>
      {item.songs.map((song) => (
        <PlaylistItem
          key={song._id}
          song={song}
          isPlaying={currentSong?._id === song._id}
          isLoading={currentSong?._id === song._id && isLoadingAudio}
          onPress={() => playSong(song, item.user._id)}
        />
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#B98CFF" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "group" && styles.tabActive]}
          onPress={() => setActiveTab("group")}
        >
          <Text style={[styles.tabText, activeTab === "group" && styles.tabTextActive]}>
            Group Members
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "me" && styles.tabActive]}
          onPress={() => setActiveTab("me")}
        >
          <Text style={[styles.tabText, activeTab === "me" && styles.tabTextActive]}>
            My Playlist
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayPlaylists}
        keyExtractor={(item) => item.user._id}
        renderItem={renderPlaylist}
        contentContainerStyle={{ padding: 16, paddingBottom: currentSong ? 200 : 40 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🎶</Text>
            <Text style={styles.emptyText}>
              {activeTab === "me"
                ? "You haven't submitted any songs yet."
                : "No songs from group members yet."}
            </Text>
          </View>
        }
      />

      {currentSong && (
        <View style={styles.miniPlayer}>
          <TouchableOpacity style={styles.miniPlayerContent} onPress={() => {}}>
            {currentSong.thumbnailUrl ? (
              <Image source={{ uri: currentSong.thumbnailUrl }} style={styles.miniThumb} />
            ) : (
              <View style={[styles.miniThumb, styles.miniThumbPlaceholder]}>
                <Text style={{ fontSize: 14 }}>🎵</Text>
              </View>
            )}
            <View style={styles.miniInfo}>
              <Text style={styles.miniTitle} numberOfLines={1}>{currentSong.title}</Text>
              <Text style={styles.miniArtist} numberOfLines={1}>{currentSong.artist || "Unknown"}</Text>
              <View style={styles.miniProgressRow}>
                <View style={styles.miniProgressTrack}>
                  <View style={[styles.miniProgressFill, { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }]} />
                </View>
                <Text style={styles.miniTime}>{formatTime(position)}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.miniControls}>
            <TouchableOpacity onPress={() => playSong(currentSong, currentUserId)} style={styles.miniControlBtn}>
              <Text style={styles.miniControlIcon}>{isPlaying ? "⏸" : "▶"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={closePlayer} style={styles.miniControlBtn}>
              <Text style={styles.miniControlIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#12111A" },
  center: { flex: 1, backgroundColor: "#12111A", alignItems: "center", justifyContent: "center" },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1E1C2A",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  tabActive: {
    backgroundColor: "#B98CFF",
    borderColor: "#B98CFF",
  },
  tabText: { color: "#9C97AE", fontWeight: "700", fontSize: 13 },
  tabTextActive: { color: "#12111A" },
  playlistSection: { marginBottom: 24 },
  playlistHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2E2B3E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarEmoji: { fontSize: 20 },
  userName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  songCount: { color: "#9C97AE", fontSize: 12, marginTop: 2 },
  emptyWrap: { alignItems: "center", marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#6E6A80", fontSize: 14, textAlign: "center" },

  miniPlayer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A1828",
    borderTopWidth: 1,
    borderTopColor: "#2E2B3E",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
        paddingBottom: Platform.OS === "ios" ? 28 : 12,
  },
  miniPlayerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  miniThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#2E2B3E",
  },
  miniThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  miniInfo: {
    flex: 1,
    marginLeft: 10,
  },
  miniTitle: { color: "#fff", fontSize: 13, fontWeight: "700" },
  miniArtist: { color: "#9C97AE", fontSize: 11, marginTop: 1 },
  miniProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  miniProgressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "#2E2B3E",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    backgroundColor: "#B98CFF",
    borderRadius: 1.5,
  },
  miniTime: {
    color: "#6E6A80",
    fontSize: 10,
    marginLeft: 6,
    fontWeight: "600",
    minWidth: 30,
  },
  miniControls: {
    flexDirection: "row",
    gap: 4,
    marginLeft: 8,
  },
  miniControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2E2B3E",
    alignItems: "center",
    justifyContent: "center",
  },
  miniControlIcon: { color: "#fff", fontSize: 14 },
});
