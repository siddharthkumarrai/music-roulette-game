import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../config/api";

export default function RoomRulesScreen({ route }) {
  const insets = useSafeAreaInsets();
  const { groupId } = route.params;
  const [group, setGroup] = useState(null);

  useFocusEffect(
    useCallback(() => {
      api.get(`/groups/${groupId}`).then(({ data }) => setGroup(data.group));
    }, [groupId])
  );

  if (!group) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#B98CFF" size="large" />
      </View>
    );
  }

  const s = group.settings;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }}>
      <Text style={styles.heading}>How This Room Works</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Routine</Text>
        <RuleRow icon="🎵" label="Submit one YouTube song per day" />
        <RuleRow icon="⏰" label={`Deadline: ${s.dailyDeadlineHour}:00`} />
        <RuleRow icon="🎧" label="Listen to every other member's song" />
        <RuleRow icon="⭐" label="Rate & review after listening to 90%" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Scoring</Text>
        <RuleRow icon="✅" label={`Complete daily quest: +${s.pointsDailyComplete} pts`} />
        <RuleRow icon="🏆" label={`Best song of the day: +${s.pointsBestCurationBonus} pts`} />
        <RuleRow icon="🔥" label={`${s.streakLengthForBonus}-day streak bonus: +${s.pointsStreakBonus} pts`} />
        <RuleRow icon="❌" label={`Skip without pass: ${s.penaltyUnexcusedSkip} pts`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Streaks & Passes</Text>
        <RuleRow icon="🔥" label="Complete quest OR use busy pass to keep streak alive" />
        <RuleRow icon="🛌" label={`Busy passes: ${s.busyPassesPerWeek} per week (refill Monday)`} />
        <RuleRow icon="📈" label="Streak bonus triggers every streakLengthForBonus days" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resets</Text>
        <RuleRow icon="📅" label="Weekly points reset every Sunday" />
        <RuleRow icon="📆" label="Monthly points reset on last day of month" />
        <RuleRow icon="🔄" label="Busy passes refill every Monday" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Winner</Text>
        <RuleRow icon="🏆" label="Winner = player whose songs get the MOST ratings from others" />
        <RuleRow icon="📊" label="Ratings count matters, not the star value" />
        <RuleRow icon="🥇🥈🥉" label="Top 3 ranked by ratings received, then points, then songs" />
        <RuleRow icon="📅" label="Winner recorded every Sunday at midnight" />
        <RuleRow icon="👀" label="Check the Winners tab in Leaderboard for past results" />
      </View>

      <Text style={styles.footer}>
        Timezone: {s.timezone} · Deadline: {s.dailyDeadlineHour}:00
      </Text>
    </ScrollView>
  );
}

function RuleRow({ icon, label }) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleIcon}>{icon}</Text>
      <Text style={styles.ruleLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#12111A" },
  center: { flex: 1, backgroundColor: "#12111A", alignItems: "center", justifyContent: "center" },
  heading: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 20 },
  card: {
    backgroundColor: "#1E1C2A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  cardTitle: { color: "#B98CFF", fontSize: 15, fontWeight: "700", marginBottom: 12 },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  ruleIcon: { fontSize: 18, width: 28, textAlign: "center" },
  ruleLabel: { color: "#D1D0DB", fontSize: 14, flex: 1, lineHeight: 20 },
  footer: { color: "#6E6A80", fontSize: 12, textAlign: "center", marginTop: 12, marginBottom: 40 },
});
