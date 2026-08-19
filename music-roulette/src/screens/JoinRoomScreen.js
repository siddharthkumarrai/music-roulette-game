import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../config/api";
import { colors } from "../theme/colors";

export default function JoinRoomScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Text style={styles.title}>Join a Room</Text>
      <Text style={styles.subtitle}>Ask a friend in the room for their 6-character invite code.</Text>

      <TextInput
        style={styles.input}
        placeholder="ABCD12"
        placeholderTextColor={colors.textSecondary}
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={6}
      />

      <TouchableOpacity style={styles.btn} onPress={handleJoin} disabled={joining}>
        <Text style={styles.btnText}>{joining ? "Joining..." : "Join Room"}</Text>
      </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: "center" },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginBottom: 30 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    color: "#fff",
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  btn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  btnText: { color: colors.background, fontWeight: "800", fontSize: 16 },
});
