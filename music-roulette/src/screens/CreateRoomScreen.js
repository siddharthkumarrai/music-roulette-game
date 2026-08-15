import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { api } from "../config/api";

const DEADLINE_OPTIONS = [18, 19, 20, 21, 22];

export default function CreateRoomScreen({ navigation }) {
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>Create a Room</Text>
      <Text style={styles.subtitle}>
        Any number of people can join — pick a size that fits your group.
      </Text>

      <Text style={styles.label}>Room name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. College Squad, Family Beats..."
        placeholderTextColor="#6E6A80"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Max members</Text>
      <TextInput
        style={styles.input}
        placeholder="6"
        placeholderTextColor="#6E6A80"
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#12111A" },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "#9C97AE", fontSize: 13, marginBottom: 28 },
  label: { color: "#fff", fontWeight: "700", marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: "#1E1C2A",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    color: "#fff",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 30 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#1E1C2A", borderWidth: 1, borderColor: "#2E2B3E" },
  chipActive: { backgroundColor: "#B98CFF", borderColor: "#B98CFF" },
  chipText: { color: "#9C97AE", fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#12111A" },
  createBtn: { backgroundColor: "#B98CFF", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  createBtnText: { color: "#12111A", fontWeight: "800", fontSize: 16 },
});
