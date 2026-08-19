import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../config/api";
import { colors } from "../theme/colors";

const DEADLINE_OPTIONS = [18, 19, 20, 21, 22];

export default function CreateRoomScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [maxMembers, setMaxMembers] = useState("6");
  const [deadlineHour, setDeadlineHour] = useState(20);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Room name required", "Give your room a name, e.g. \"College Squad\".");
      return;
    }
    const max = parseInt(maxMembers, 10);
    if (!max || max < 2 || max > 50) {
      Alert.alert("Invalid size", "Room size must be between 2 and 50 members.");
      return;
    }

    setCreating(true);
    try {
      const { data } = await api.post("/groups", {
        name: name.trim(),
        maxMembers: max,
        dailyDeadlineHour: deadlineHour,
      });
      navigation.replace("Room", { groupId: data.group._id, groupName: data.group.name });
    } catch (err) {
      Alert.alert("Couldn't create room", err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}>
      <Text style={styles.title}>Create a Room</Text>
      <Text style={styles.subtitle}>
        Any number of people can join — pick a size that fits your group.
      </Text>

      <Text style={styles.label}>Room name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. College Squad, Family Beats..."
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Max members</Text>
      <TextInput
        style={styles.input}
        placeholder="6"
        placeholderTextColor={colors.textSecondary}
        value={maxMembers}
        onChangeText={setMaxMembers}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Daily deadline</Text>
      <View style={styles.chipRow}>
        {DEADLINE_OPTIONS.map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.chip, deadlineHour === h && styles.chipActive]}
            onPress={() => setDeadlineHour(h)}
          >
            <Text style={[styles.chipText, deadlineHour === h && styles.chipTextActive]}>
              {h % 12 === 0 ? 12 : h % 12}:00 {h >= 12 ? "PM" : "AM"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
        <Text style={styles.createBtnText}>{creating ? "Creating..." : "Create Room"}</Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: 28 },
  label: { color: "#fff", fontWeight: "700", marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    color: "#fff",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 30 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: colors.background },
  createBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  createBtnText: { color: colors.background, fontWeight: "800", fontSize: 16 },
});
