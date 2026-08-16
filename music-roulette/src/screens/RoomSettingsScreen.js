import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../config/api";
import { useAuth } from "../context/AuthContext";

export default function RoomSettingsScreen({ route }) {
  const insets = useSafeAreaInsets();
  const { groupId } = route.params;
  const { user } = useAuth();
  const [group, setGroup] = useState(null);

  useFocusEffect(
    useCallback(() => {
      api.get(`/groups/${groupId}`).then(({ data }) => setGroup(data.group));
    }, [groupId])
  );

  if (!group) return null;

  const isOwner = group.members.find((m) => m.user._id === user.id)?.role === "owner";

  const shareCode = () => {
    Share.share({
      message: `Join my Music Roulette room "${group.name}"! Use invite code: ${group.inviteCode}`,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }}>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Invite Code</Text>
        <Text style={styles.code}>{group.inviteCode}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
          <Text style={styles.shareBtnText}>Share Invite</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Members ({group.members.length})</Text>
      {group.members.map((m) => (
        <View key={m.user._id} style={styles.memberRow}>
          <Text style={styles.memberEmoji}>{m.user.avatarEmoji}</Text>
          <Text style={styles.memberName}>{m.user.name}</Text>
          {m.role === "owner" && <Text style={styles.ownerBadge}>Owner</Text>}
        </View>
      ))}

      <Text style={styles.sectionTitle}>Room Rules</Text>
      <View style={styles.ruleCard}>
        <RuleRow label="Daily deadline" value={`${group.settings.dailyDeadlineHour}:00`} />
        <RuleRow label="Points for full quest" value={`+${group.settings.pointsDailyComplete}`} />
        <RuleRow label="Best curation bonus" value={`+${group.settings.pointsBestCurationBonus}`} />
        <RuleRow
          label={`${group.settings.streakLengthForBonus}-day streak bonus`}
          value={`+${group.settings.pointsStreakBonus}`}
        />
        <RuleRow label="Unexcused skip penalty" value={`${group.settings.penaltyUnexcusedSkip}`} />
        <RuleRow label="Busy passes / week" value={`${group.settings.busyPassesPerWeek}`} />
      </View>
      {isOwner && (
        <Text style={styles.ownerHint}>
          You're the owner — rule editing is available via the API (PATCH settings) for now.
        </Text>
      )}
    </ScrollView>
  );
}

function RuleRow({ label, value }) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <Text style={styles.ruleValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#12111A" },
  codeCard: { backgroundColor: "#1E1C2A", borderRadius: 18, padding: 24, alignItems: "center", marginBottom: 28, borderWidth: 1, borderColor: "#2E2B3E" },
  codeLabel: { color: "#9C97AE", fontSize: 12, marginBottom: 8 },
  code: { color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: 6, marginBottom: 16 },
  shareBtn: { backgroundColor: "#B98CFF", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
  shareBtnText: { color: "#12111A", fontWeight: "800" },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 12 },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1E1C2A", borderRadius: 12, padding: 12, marginBottom: 8 },
  memberEmoji: { fontSize: 20, marginRight: 10 },
  memberName: { color: "#fff", fontWeight: "600", flex: 1 },
  ownerBadge: { color: "#B98CFF", fontSize: 11, fontWeight: "700" },
  ruleCard: { backgroundColor: "#1E1C2A", borderRadius: 14, padding: 16, marginTop: 20, marginBottom: 12 },
  ruleRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  ruleLabel: { color: "#9C97AE", fontSize: 13 },
  ruleValue: { color: "#fff", fontWeight: "700", fontSize: 13 },
  ownerHint: { color: "#6E6A80", fontSize: 12, textAlign: "center", marginBottom: 20 },
});
