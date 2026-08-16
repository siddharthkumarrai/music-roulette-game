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
const POLL_INTERVAL_MS = 4000;
const MAX_AUTO_RETRIES = 3;

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
  const [liveTitle, setLiveTitle] = useState(song.title);
  const [liveArtist, setLiveArtist] = useState(song.artist);
  const [liveThumb, setLiveThumb] = useState(song.thumbnailUrl);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Preparing your song...");

  const audioUrl = resolvedAudioUrl;

  useEffect(() => {
    if (audioReady && audioUrl) return;

    let failedCount = 0;
    pollTimer.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/audio/${song.youtubeVideoId}/status`);
        setExtractionProgress(data.progress);
        if (data.title) setLiveTitle(data.title);
        if (data.artist) setLiveArtist(data.artist);
        if (data.thumbnailUrl) setLiveThumb(data.thumbnailUrl);
        if (data.durationSeconds) setDuration(data.durationSeconds);

        if (data.progress?.state === "done" || data.streamReady || data.audioUrl) {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
          setAudioReady(true);
          if (data.audioUrl) setResolvedAudioUrl(data.audioUrl);
          return;
        }

        if (data.progress?.state === "failed") {
          failedCount++;
          if (failedCount >= 2) {
            setAutoRetryCount((prev) => {
              const next = prev + 1;
              if (next >= MAX_AUTO_RETRIES) {
                clearInterval(pollTimer.current);
                pollTimer.current = null;
                setLoadError(true);
              } else {
                setStatusMessage(`Retrying... attempt ${next + 1} of ${MAX_AUTO_RETRIES}`);
                api.post(`/audio/${song.youtubeVideoId}/retry`).catch(() => {});
              }
              return next;
            });
            failedCount = 0;
          }
          return;
        }

        if (data.progress?.state === "extracting" || data.progress?.state === "converting" || data.progress?.state === "uploading") {
          failedCount = 0;
          if (data.progress.state === "extracting") setStatusMessage(`Extracting audio... ${data.progress.percent || 0}%`);
          else if (data.progress.state === "converting") setStatusMessage(`Converting to MP3... ${data.progress.percent || 0}%`);
          else if (data.progress.state === "uploading") setStatusMessage("Uploading to cloud...");
        }
      } catch {}
    }, POLL_INTERVAL_MS);

    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [song.youtubeVideoId, audioReady, audioUrl, retryCount]);

  useEffect(() => {
    if (!audioReady) return;
    if (!audioUrl) {
      const waitTimer = setTimeout(() => {
        setLoading(false);
        setLoadError(true);
      }, 5000);
      return () => clearTimeout(waitTimer);
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
    const displayThumb = liveThumb || song.thumbnailUrl;
    const displayTitle = liveTitle || song.title || song.youtubeVideoId;
    const displayArtist = liveArtist || song.artist || "Unknown Artist";
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
        {displayThumb ? (
          <Image source={{ uri: displayThumb }} style={[styles.artwork, { width: 180, height: 180, marginBottom: 24 }]} />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder, { width: 180, height: 180, marginBottom: 24 }]}>
            <Text style={{ fontSize: 48 }}>🎵</Text>
          </View>
        )}
        <Text style={styles.trackTitle} numberOfLines={1}>{displayTitle}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{displayArtist}</Text>
        <ActivityIndicator color="#B98CFF" style={{ marginTop: 16 }} size="large" />
        <Text style={{ color: "#B98CFF", fontSize: 14, fontWeight: "600", marginTop: 12, textAlign: "center" }}>{statusMessage}</Text>
        <View style={styles.progressBarOuter}>
          <View style={[styles.progressBarInner, { width: `${Math.max(pct, 2)}%` }]} />
        </View>
        <Text style={{ color: "#6E6A80", fontSize: 12, marginTop: 10, textAlign: "center" }}>
          This usually takes a few seconds.{"\n"}We're extracting audio from YouTube for you.
        </Text>
      </View>
    );
  }

  if (loadError) {
    const displayThumb = liveThumb || song.thumbnailUrl;
    const displayTitle = liveTitle || song.title || song.youtubeVideoId;
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center", padding: 32 }]}>
        {displayThumb ? (
          <Image source={{ uri: displayThumb }} style={[styles.artwork, { width: 140, height: 140, marginBottom: 20 }]} />
        ) : null}
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 4 }}>{displayTitle}</Text>
        <Text style={{ color: "#F87171", fontSize: 14, fontWeight: "700", marginBottom: 8 }}>Audio extraction failed</Text>
        <Text style={{ color: "#9C97AE", fontSize: 13, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
          We tried {MAX_AUTO_RETRIES} times automatically but YouTube blocked the download.{"\n"}{"\n"}You can try again manually or skip this song.
        </Text>
        <TouchableOpacity
          style={[styles.submitBtn, { width: 220, marginBottom: 12 }]}
          onPress={async () => {
            setLoadError(false);
            setAutoRetryCount(0);
            setExtractionProgress({ state: "extracting", percent: 5 });
            setStatusMessage("Retrying extraction...");
            setRetryCount((c) => c + 1);
            try {
              await api.post(`/audio/${song.youtubeVideoId}/retry`);
            } catch {}
          }}
        >
          <Text style={styles.submitBtnText}>Try Again</Text>
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
        {liveThumb ? (
          <Image source={{ uri: liveThumb }} style={styles.artwork} />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Text style={{ fontSize: 48 }}>🎵</Text>
          </View>
        )}

        <Text style={styles.trackTitle} numberOfLines={1}>{liveTitle || song.youtubeVideoId}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{liveArtist || "Unknown Artist"}</Text>

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
