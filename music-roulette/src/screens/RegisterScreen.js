import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

function AnimatedSpinner({ size = 20, color = colors.background }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <ActivityIndicator size={size} color={color} />
    </Animated.View>
  );
}

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const nameBorder = useRef(new Animated.Value(0)).current;
  const emailBorder = useRef(new Animated.Value(0)).current;
  const passwordBorder = useRef(new Animated.Value(0)).current;
  const confirmBorder = useRef(new Animated.Value(0)).current;
  const nameScale = useRef(new Animated.Value(1)).current;
  const emailScale = useRef(new Animated.Value(1)).current;
  const passwordScale = useRef(new Animated.Value(1)).current;
  const confirmScale = useRef(new Animated.Value(1)).current;
  const passwordIconOpacity = useRef(new Animated.Value(1)).current;
  const confirmIconOpacity = useRef(new Animated.Value(1)).current;

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(10)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(10)).current;

  const input1Opacity = useRef(new Animated.Value(0)).current;
  const input1TranslateY = useRef(new Animated.Value(10)).current;
  const input2Opacity = useRef(new Animated.Value(0)).current;
  const input2TranslateY = useRef(new Animated.Value(10)).current;
  const input3Opacity = useRef(new Animated.Value(0)).current;
  const input3TranslateY = useRef(new Animated.Value(10)).current;
  const input4Opacity = useRef(new Animated.Value(0)).current;
  const input4TranslateY = useRef(new Animated.Value(10)).current;

  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnTranslateY = useRef(new Animated.Value(10)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const stagger = (anim, ty) =>
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]),
      stagger(titleOpacity, titleTranslateY),
      Animated.delay(40),
      stagger(subtitleOpacity, subtitleTranslateY),
      Animated.delay(40),
      stagger(input1Opacity, input1TranslateY),
      Animated.delay(60),
      stagger(input2Opacity, input2TranslateY),
      Animated.delay(60),
      stagger(input3Opacity, input3TranslateY),
      Animated.delay(60),
      stagger(input4Opacity, input4TranslateY),
      Animated.delay(40),
      stagger(btnOpacity, btnTranslateY),
      Animated.delay(40),
      Animated.timing(footerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateInput = (borderVal, scaleVal, toFocus) => {
    Animated.parallel([
      Animated.timing(borderVal, { toValue: toFocus ? 1 : 0, duration: 150, useNativeDriver: false }),
      Animated.timing(scaleVal, { toValue: toFocus ? 1.01 : 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Missing info", "Fill in all fields.");
      triggerShake();
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      triggerShake();
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      Alert.alert("Passwords don't match", "Please make sure both passwords are the same.");
      triggerShake();
      return;
    }
    setPasswordMismatch(false);
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
    } catch (err) {
      Alert.alert("Sign up failed", err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const pressIn = (sv) => {
    Animated.timing(sv, { toValue: 0.96, duration: 80, useNativeDriver: true }).start();
  };
  const pressOut = (sv) => {
    Animated.spring(sv, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const makeBorderColor = (bv) =>
    bv.interpolate({ inputRange: [0, 1], outputRange: [colors.surfaceBorder, colors.primary] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.inner, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.backBtn, { marginTop: 8 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.logoSection}>
            <Animated.View style={[styles.logoMark, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
              <Text style={styles.logoEmoji}>🎵</Text>
            </Animated.View>
            <Animated.Text style={[styles.wordmark, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
              Music Roulette
            </Animated.Text>
          </View>

          <View style={styles.headingSection}>
            <Animated.Text
              style={[styles.welcomeTitle, { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]}
            >
              Create Account
            </Animated.Text>
            <Animated.Text
              style={[styles.welcomeSub, { opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslateY }] }]}
            >
              Join or start your own listening rooms
            </Animated.Text>
          </View>

          <Animated.View style={{ opacity: input1Opacity, transform: [{ translateY: input1TranslateY }, { translateX: shakeAnim }] }}>
            <Animated.View style={[styles.inputRow, { borderColor: makeBorderColor(nameBorder), transform: [{ scale: nameScale }] }]}>
              <User size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                onFocus={() => animateInput(nameBorder, nameScale, true)}
                onBlur={() => animateInput(nameBorder, nameScale, false)}
              />
            </Animated.View>
          </Animated.View>

          <Animated.View style={{ opacity: input2Opacity, transform: [{ translateY: input2TranslateY }, { translateX: shakeAnim }] }}>
            <Animated.View style={[styles.inputRow, { borderColor: makeBorderColor(emailBorder), transform: [{ scale: emailScale }] }]}>
              <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => animateInput(emailBorder, emailScale, true)}
                onBlur={() => animateInput(emailBorder, emailScale, false)}
              />
            </Animated.View>
          </Animated.View>

          <Animated.View style={{ opacity: input3Opacity, transform: [{ translateY: input3TranslateY }, { translateX: shakeAnim }] }}>
            <Animated.View style={[styles.inputRow, { borderColor: makeBorderColor(passwordBorder), transform: [{ scale: passwordScale }] }]}>
              <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password (min 6 chars)"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => animateInput(passwordBorder, passwordScale, true)}
                onBlur={() => animateInput(passwordBorder, passwordScale, false)}
              />
              <TouchableOpacity
                onPress={() => {
                  Animated.sequence([
                    Animated.timing(passwordIconOpacity, { toValue: 0, duration: 60, useNativeDriver: true }),
                    Animated.timing(passwordIconOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
                  ]).start();
                  setShowPassword(!showPassword);
                }}
                style={styles.eyeBtn}
                activeOpacity={0.6}
              >
                <Animated.View style={{ opacity: passwordIconOpacity }}>
                  {showPassword ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <Animated.View style={{ opacity: input4Opacity, transform: [{ translateY: input4TranslateY }, { translateX: shakeAnim }] }}>
            <Animated.View
              style={[
                styles.inputRow,
                {
                  borderColor: passwordMismatch ? colors.danger : makeBorderColor(confirmBorder),
                  transform: [{ scale: confirmScale }],
                },
              ]}
            >
              <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirm password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); if (passwordMismatch) setPasswordMismatch(false); }}
                secureTextEntry={!showConfirm}
                onFocus={() => animateInput(confirmBorder, confirmScale, true)}
                onBlur={() => animateInput(confirmBorder, confirmScale, false)}
              />
              <TouchableOpacity
                onPress={() => {
                  Animated.sequence([
                    Animated.timing(confirmIconOpacity, { toValue: 0, duration: 60, useNativeDriver: true }),
                    Animated.timing(confirmIconOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
                  ]).start();
                  setShowConfirm(!showConfirm);
                }}
                style={styles.eyeBtn}
                activeOpacity={0.6}
              >
                <Animated.View style={{ opacity: confirmIconOpacity }}>
                  {showConfirm ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
            {passwordMismatch && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
          </Animated.View>

          <Animated.View style={{ opacity: btnOpacity, transform: [{ translateY: btnTranslateY }] }}>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
              onPressIn={() => pressIn(btnScale)}
              onPressOut={() => pressOut(btnScale)}
            >
              <Animated.View style={[styles.createBtnInner, { transform: [{ scale: btnScale }] }]}>
                {loading ? (
                  <AnimatedSpinner size={20} color={colors.background} />
                ) : (
                  <Text style={styles.createBtnText}>Create Account</Text>
                )}
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Log in</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, paddingHorizontal: 24 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  logoSection: { alignItems: "center", marginTop: 28 },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 36 },
  wordmark: { color: colors.primary, fontSize: 24, fontWeight: "800" },
  headingSection: { alignItems: "center", marginTop: 28, marginBottom: 24 },
  welcomeTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  welcomeSub: { color: colors.textSecondary, fontSize: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 14,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: colors.textPrimary, fontSize: 15, height: "100%" },
  eyeBtn: { padding: 4, marginLeft: 8 },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "600", marginTop: -6, marginBottom: 10, marginLeft: 4 },
  createBtn: { marginTop: 8, marginBottom: 24 },
  createBtnInner: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: { color: colors.background, fontWeight: "800", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  footerLink: { color: colors.primary, fontSize: 14, fontWeight: "700" },
});
