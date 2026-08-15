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
import { useAuth } from "../context/AuthContext";

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Missing info", "Fill in name, email, and password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
    } catch (err) {
      Alert.alert("Sign up failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>🎵 Create Account</Text>
      <Text style={styles.subtitle}>Join or start your own listening rooms</Text>

      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor="#6E6A80"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#6E6A80"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 chars)"
        placeholderTextColor="#6E6A80"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
        <Text style={styles.btnText}>{loading ? "..." : "Create Account"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#12111A", padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 6 },
  subtitle: { color: "#9C97AE", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#1E1C2A",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    color: "#fff",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2E2B3E",
  },
  btn: { backgroundColor: "#B98CFF", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 10 },
  btnText: { color: "#12111A", fontWeight: "800", fontSize: 16 },
  link: { color: "#B98CFF", textAlign: "center", marginTop: 20 },
});
