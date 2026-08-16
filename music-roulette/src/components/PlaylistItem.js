import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { api } from "../config/api";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlaylistItem({ song, isPlaying, isLoading, onPress }) {
  const [audioReady, setAudioReady] = useState(!!song.audioUrl || !!song.streamReady);
  const pollRef = useRef(null);

  useEffect(() => {
    if (audioReady) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/audio/${song.youtubeVideoId}/status`);
        if (data.streamReady || data.audioUrl) {
          setAudioReady(true);
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {}
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [song.youtubeVideoId, audioReady]);

  return (
    <TouchableOpacity
      style={[styles.container, isPlaying && styles.containerActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {song.thumbnailUrl ? (
        <Image source={{ uri: song.thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={{ fontSize: 20 }}>🎵</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title || song.youtubeVideoId}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artist || "Unknown Artist"}
        </Text>
        <View style={styles.metaRow}>
          {song.durationSeconds > 0 && (
            <Text style={styles.duration}>{formatDuration(song.durationSeconds)}</Text>
          )}
          {!audioReady && (
            <Text style={styles.processing}>Processing...</Text>
          )}
          {song.dropDate && (
            <Text style={styles.date}>{song.dropDate}</Text>
          )}
        </View>
      </View>

      <View style={styles.playBtnWrap}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#B98CFF" />
        ) : (
          <View style={[styles.playBtn, isPlaying && styles.playBtnActive]}>
            <Text style={styles.playBtnIcon}>
              {isPlaying ? "⏸" : "▶"}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1C2A",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  containerActive: {
    borderColor: "#B98CFF",
    backgroundColor: "#251F35",
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#2E2B3E",
  },
  thumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  artist: {
    color: "#9C97AE",
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  duration: {
    color: "#6E6A80",
    fontSize: 11,
    fontWeight: "600",
  },
  processing: {
    color: "#B98CFF",
    fontSize: 11,
    fontWeight: "600",
  },
  date: {
    color: "#6E6A80",
    fontSize: 11,
  },
  playBtnWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2E2B3E",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnActive: {
    backgroundColor: "#B98CFF",
  },
  playBtnIcon: {
    fontSize: 14,
    color: "#fff",
  },
});
