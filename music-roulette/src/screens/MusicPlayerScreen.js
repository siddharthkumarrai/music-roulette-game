import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  AppState,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Audio } from "expo-av";
import { api } from "../config/api";

const MIN_REACTION_LENGTH = 20;
const LISTEN_THRESHOLD = 0.9;
const SEEK_GUARD_SECONDS = 2;
const TICK_INTERVAL_MS = 1000;
const POLL_INTERVAL_MS = 2000;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getExtractionLabel(progress) {
  if (!progress) return "Preparing...";
  switch (progress.state) {
    case "extracting": return `Extracting audio... ${progress.percent}%`;
    case "converting": return `Converting to MP3... ${progress.percent}%`;
    case "uploading": return `Uploading to cloud... ${progress.percent}%`;
    case "done": return "Almost ready...";
    case "failed": return "Conversion failed";
    default: return "Preparing audio...";
  }
}

export default function MusicPlayerScreen({ route, navigation }) {
  const { groupId, song, myLog } = route.params;
  const alreadyCompleted = myLog?.status === "completed";

  const soundRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const lastTickPosition = useRef(0);
  const tickTimer = useRef(null);
  const pollTimer = useRef(null);
  const buttonGuard = useRef(false);
  const scrollRef = useRef(null);

  const [playerState, setPlayerState] = useState("buffering");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(song.durationSeconds || 0);
  const [secondsActuallyPlayed, setSecondsActuallyPlayed] = useState(0);
  const [canRate, setCanRate] = useState(alreadyCompleted);
  const [rating, setRating] = useState(myLog?.rating || 0);
  const [reaction, setReaction] = useState(myLog?.reactionText || "");
  const [saving, setSaving] = useState(false);

  const [extractionProgress, setExtractionProgress] = useState(null);
  const [audioReady, setAudioReady] = useState(!!song.audioUrl);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState(song.audioUrl || null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const audioUrl = resolvedAudioUrl;

  useEffect(() => {
    if (audioReady && audioUrl) return;

    let failedCount = 0;
    pollTimer.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/audio/${song.youtubeVideoId}/status`);
        setExtractionProgress(data.progress);

        if (data.progress?.state === "done" || data.streamReady || data.audioUrl) {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
          setAudioReady(true);
          if (data.audioUrl) setResolvedAudioUrl(data.audioUrl);
          if (data.durationSeconds) setDuration(data.durationSeconds);
          return;
        }
        if (data.progress?.state === "failed") {
          failedCount++;
          if (failedCount >= 3) {
            clearInterval(pollTimer.current);
            pollTimer.current = null;
            setLoadError(true);
          }
          return;
        }
        failedCount = 0;
      } catch {}
    }, POLL_INTERVAL_MS);

    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [song.youtubeVideoId, audioReady, audioUrl, retryCount]);

  useEffect(() => {
    if (!audioReady) return;
    if (!audioUrl) {
      setLoading(false);
      setLoadError(true);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        if (!mounted) { sound.unloadAsync(); return; }
        soundRef.current = sound;
      } catch (err) {
        console.warn("Audio load failed:", err.message);
        setLoadError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [audioReady, audioUrl]);

  const onPlaybackStatusUpdate = useCallback((status) => {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis / 1000);
    setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);

    if (status.didJustFinish) {
      setPlayerState("ended");
    } else if (status.isBuffering) {
      setPlayerState("buffering");
    } else if (status.isPlaying) {
      setPlayerState("playing");
    } else {
      setPlayerState("paused");
    }
  }, []);

  useEffect(() => {
    if (playerState !== "playing") {
      if (tickTimer.current) clearInterval(tickTimer.current);
      return;
    }

    tickTimer.current = setInterval(async () => {
      if (!soundRef.current) return;
      try {
        const status = await soundRef.current.getStatusAsync();
        if (!status.isPlaying) return;

        const currentPos = status.positionMillis / 1000;
        const prevPos = lastTickPosition.current;

        if (currentPos - prevPos > SEEK_GUARD_SECONDS) {
          lastTickPosition.current = currentPos;
          return;
        }

        if (currentPos - prevPos > 0.5 && currentPos - prevPos <= SEEK_GUARD_SECONDS) {
          setSecondsActuallyPlayed((prev) => prev + 1);
        }

        lastTickPosition.current = currentPos;

        const dur = status.durationMillis ? status.durationMillis / 1000 : 0;
        if (dur > 0) {
          const totalPlayed = secondsActuallyPlayed + 1;
          if (totalPlayed >= dur * LISTEN_THRESHOLD) {
            setCanRate(true);
          }
        }
      } catch {}
    }, TICK_INTERVAL_MS);

    return () => { if (tickTimer.current) clearInterval(tickTimer.current); };
  }, [playerState]);

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
    if (playerState === "ended" && !canRate) {
      setCanRate(true);
    }
  }, [playerState, canRate]);

  const pauseAudio = async () => {
    if (!soundRef.current) return;
    try { await soundRef.current.pauseAsync(); } catch {}
  };

  const resumeAudio = async () => {
    if (!soundRef.current) return;
    try { await soundRef.current.playAsync(); } catch {}
  };

  const togglePlayback = async () => {
    if (buttonGuard.current) return;
    buttonGuard.current = true;
    setTimeout(() => { buttonGuard.current = false; }, 400);

    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch {}
  };

  const submitProof = async (status) => {
    if (status === "completed") {
      if (!canRate) {
        Alert.alert("Not yet", "Listen to at least 90% of the track first.");
        return;
      }
      if (rating === 0) {
        Alert.alert("Rate it", "Give the song a star rating (1-5) before submitting.");
        return;
      }
      if (reaction.trim().length < MIN_REACTION_LENGTH) {
        Alert.alert(
          "Reaction too short",
          `Write at least ${MIN_REACTION_LENGTH} characters about a specific line, beat, or moment.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const { data } = await api.post(`/groups/${groupId}/logs`, {
        songId: song._id,
        status,
        rating: status === "completed" ? rating : undefined,
        reactionText: status === "completed" ? reaction.trim() : undefined,
        listenedSeconds: Math.round(secondsActuallyPlayed),
        durationSeconds: Math.round(duration),
      });
      if (data.pointsAwarded) {
        Alert.alert(
          data.pointsAwarded > 0 ? "Points earned!" : "Penalty applied",
          `${data.pointsAwarded > 0 ? "+" : ""}${data.pointsAwarded} points`
        );
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error saving", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip this song?",
      "This applies a penalty unless you use your busy pass on the room screen instead.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm Skip", style: "destructive", onPress: () => submitProof("skipped") },
      ]
    );
  };

  const playPauseLabel = () => {
    if (playerState === "playing") return "Pause";
    if (playerState === "buffering") return "Loading...";
    return "Play";
  };

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  const showExtractionUI = !audioReady && !loadError;

  if (showExtractionUI) {
    const pct = extractionProgress?.percent || 0;
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
        {song.thumbnailUrl ? (
          <Image source={{ uri: song.thumbnailUrl }} style={[styles.artwork, { width: 180, height: 180, marginBottom: 24 }]} />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder, { width: 180, height: 180, marginBottom: 24 }]}>
            <Text style={{ fontSize: 48 }}>🎵</Text>
          </View>
        )}
        <Text style={styles.trackTitle} numberOfLines={1}>{song.title || song.youtubeVideoId}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{song.artist || "Unknown Artist"}</Text>
        <Text style={{ color: "#9C97AE", fontSize: 13, marginTop: 8 }}>{getExtractionLabel(extractionProgress)}</Text>
        <View style={styles.progressBarOuter}>
          <View style={[styles.progressBarInner, { width: `${Math.max(pct, 2)}%` }]} />
        </View>
        <Text style={{ color: "#6E6A80", fontSize: 12, marginTop: 8 }}>Converting to audio... you can't skip this step</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
        {song.thumbnailUrl ? (
          <Image source={{ uri: song.thumbnailUrl }} style={[styles.artwork, { width: 140, height: 140, marginBottom: 20 }]} />
        ) : null}
        <Text style={{ color: "#F87171", fontSize: 16, fontWeight: "700", marginBottom: 8 }}>Audio unavailable</Text>
        <Text style={{ color: "#9C97AE", fontSize: 13, textAlign: "center", marginBottom: 20, lineHeight: 20 }}>
          YouTube blocked the download for this track.{"\n"}Tap retry or ask the room owner to set up cookies.
        </Text>
        <TouchableOpacity
          style={[styles.submitBtn, { width: 200, marginBottom: 12 }]}
          onPress={async () => {
            setLoadError(false);
            setExtractionProgress({ state: "extracting", percent: 5 });
            setRetryCount((c) => c + 1);
            try {
              await api.post(`/audio/${song.youtubeVideoId}/retry`);
            } catch {}
          }}
        >
          <Text style={styles.submitBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip this song</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ padding: 20, alignItems: "center", flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
      <Text style={styles.byline}>{song.user?.name}'s pick</Text>

      <View style={styles.card}>
        {song.thumbnailUrl ? (
          <Image source={{ uri: song.thumbnailUrl }} style={styles.artwork} />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Text style={{ fontSize: 48 }}>🎵</Text>
          </View>
        )}

        <Text style={styles.trackTitle} numberOfLines={1}>{song.title || song.youtubeVideoId}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{song.artist || "Unknown Artist"}</Text>

        <View style={styles.progressRow}>
          <Text style={styles.timeLabel}>{formatTime(position)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.playPauseBtn, playerState === "playing" && styles.playPauseBtnActive]}
          onPress={togglePlayback}
          disabled={playerState === "buffering"}
        >
          <Text style={styles.playPauseText}>{playPauseLabel()}</Text>
        </TouchableOpacity>
      </View>

      {canRate ? (
        alreadyCompleted ? (
          <View style={styles.completedSection}>
            <Text style={styles.completedIcon}>✅</Text>
            <Text style={styles.completedTitle}>Already completed</Text>
            <Text style={styles.completedMeta}>
              You rated this {myLog?.rating}/5 · {formatTime(myLog?.listenedSeconds || 0)} listened
            </Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>Back to Quest</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.proofSection}>
            <Text style={styles.sectionLabel}>Rate this track</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text style={[styles.star, n <= rating && styles.starActive]}>{'\u2605'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>
              What was your favorite line, beat, or moment? (min {MIN_REACTION_LENGTH} chars)
            </Text>
            <TextInput
              style={styles.reactionInput}
              multiline
              placeholder="e.g. The bridge at 2:14 completely changes the mood..."
              placeholderTextColor="#6E6A80"
              value={reaction}
              onChangeText={setReaction}
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={() => submitProof("completed")} disabled={saving}>
              <Text style={styles.submitBtnText}>{saving ? "Saving..." : "Submit Proof"}</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        !alreadyCompleted && (
          <Text style={styles.hint}>
            Listen to at least 90% to unlock rating ({formatTime(secondsActuallyPlayed)} / {formatTime(duration * LISTEN_THRESHOLD)})
          </Text>
        )
      )}

      {!alreadyCompleted && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Can't listen today</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#12111A" },
  byline: { color: "#B98CFF", fontSize: 14, fontWeight: "700", marginBottom: 16, alignSelf: "flex-start" },
  card: {
    backgroundColor: "#1E1C2A", borderRadius: 20, padding: 24,
    width: "100%", alignItems: "center", borderWidth: 1, borderColor: "#2E2B3E",
  },
  artwork: { width: 260, height: 260, borderRadius: 16, marginBottom: 20 },
  artworkPlaceholder: { backgroundColor: "#2E2B3E", alignItems: "center", justifyContent: "center" },
  trackTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 4, textAlign: "center" },
  trackArtist: { color: "#9C97AE", fontSize: 14, marginBottom: 20, textAlign: "center" },
  progressRow: { flexDirection: "row", alignItems: "center", width: "100%", marginBottom: 20 },
  progressTrack: { flex: 1, height: 4, backgroundColor: "#2E2B3E", borderRadius: 2, marginHorizontal: 10, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#B98CFF", borderRadius: 2 },
  timeLabel: { color: "#6E6A80", fontSize: 11, fontWeight: "600", minWidth: 32, textAlign: "center" },
  playPauseBtn: { backgroundColor: "#B98CFF", width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  playPauseBtnActive: { backgroundColor: "#fff" },
  playPauseText: { color: "#12111A", fontSize: 14, fontWeight: "800" },
  progressBarOuter: { width: "80%", height: 6, backgroundColor: "#2E2B3E", borderRadius: 3, marginTop: 16, overflow: "hidden" },
  progressBarInner: { height: "100%", backgroundColor: "#B98CFF", borderRadius: 3 },
  proofSection: { width: "100%", marginTop: 24 },
  sectionLabel: { color: "#fff", fontWeight: "700", marginBottom: 10, marginTop: 16 },
  stars: { flexDirection: "row", gap: 8 },
  star: { fontSize: 34, color: "#2E2B3E" },
  starActive: { color: "#FBBF24" },
  reactionInput: {
    backgroundColor: "#1E1C2A", borderRadius: 12, padding: 14, color: "#fff",
    minHeight: 90, textAlignVertical: "top", borderWidth: 1, borderColor: "#2E2B3E",
  },
  submitBtn: { backgroundColor: "#B98CFF", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 20 },
  submitBtnText: { color: "#12111A", fontWeight: "800", fontSize: 16 },
  hint: { color: "#6E6A80", textAlign: "center", marginTop: 24, fontSize: 13, lineHeight: 20 },
  skipBtn: { alignItems: "center", marginTop: 28, paddingVertical: 10 },
  skipBtnText: { color: "#F87171", fontSize: 13 },
  completedSection: { width: "100%", alignItems: "center", marginTop: 24, padding: 20, backgroundColor: "#1E1C2A", borderRadius: 16, borderWidth: 1, borderColor: "#2E2B3E" },
  completedIcon: { fontSize: 36, marginBottom: 8 },
  completedTitle: { color: "#4ADE80", fontSize: 16, fontWeight: "700", marginBottom: 4 },
  completedMeta: { color: "#9C97AE", fontSize: 13, marginBottom: 16 },
  backBtn: { backgroundColor: "#2E2B3E", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  backBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
