import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { api } from "../config/api";

export default function JoinRoomScreen({ navigation }) {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (code.trim().length !== 6) {
      Alert.alert("Invalid code", "Invite codes are 6 characters, e.g. AB12CD.");
      return;
    }
    setJoining(true);
    try {
      const { data } = await api.post("/groups/join", { inviteCode: code.trim().toUpperCase() });
      navigation.replace("Room", { groupId: data.group._id, groupName: data.group.name });
    } catch (err) {
      Alert.alert("Couldn't join", err.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join a Room</Text>
      <Text style={styles.subtitle}>Ask a friend in the room for their 6-character invite code.</Text>

      <TextInput
        style={styles.input}
        placeholder="ABCD12"
        placeholderTextColor="#6E6A80"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={6}
      />

      <TouchableOpacity style={styles.btn} onPress={handleJoin} disabled={joining}>
        <Text style={styles.btnText}>{joining ? "Joining..." : "Join Room"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#12111A", padding: 24, justifyContent: "center" },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  subtitle: { color: "#9C97AE", fontSize: 13, textAlign: "center", marginBottom: 30 },
  input: {
    backgroundColor: "#1E1C2A",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    color: "#fff",
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  btn: { backgroundColor: "#B98CFF", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  btnText: { color: "#12111A", fontWeight: "800", fontSize: 16 },
});
