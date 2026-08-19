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
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const emailBorder = useRef(new Animated.Value(0)).current;
  const passwordBorder = useRef(new Animated.Value(0)).current;
  const passwordIconOpacity = useRef(new Animated.Value(1)).current;
  const emailScale = useRef(new Animated.Value(1)).current;
  const passwordScale = useRef(new Animated.Value(1)).current;

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

  const checkRowOpacity = useRef(new Animated.Value(0)).current;
  const checkRowTranslateY = useRef(new Animated.Value(10)).current;

  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnTranslateY = useRef(new Animated.Value(10)).current;
  const socialOpacity = useRef(new Animated.Value(0)).current;
  const socialTranslateY = useRef(new Animated.Value(10)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  const btnScale = useRef(new Animated.Value(1)).current;
  const googleScale = useRef(new Animated.Value(1)).current;
  const appleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const stagger = (anim, translateY, delay) =>
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]),
      stagger(titleOpacity, titleTranslateY, 0),
      Animated.delay(40),
      stagger(subtitleOpacity, subtitleTranslateY, 0),
      Animated.delay(40),
      stagger(input1Opacity, input1TranslateY, 0),
      Animated.delay(60),
      stagger(input2Opacity, input2TranslateY, 0),
      Animated.delay(40),
      stagger(checkRowOpacity, checkRowTranslateY, 0),
      Animated.delay(40),
      stagger(btnOpacity, btnTranslateY, 0),
      Animated.delay(40),
      stagger(socialOpacity, socialTranslateY, 0),
      Animated.delay(40),
      Animated.timing(footerOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateInput = (borderVal, scaleVal, toFocus) => {
    Animated.parallel([
      Animated.timing(borderVal, {
        toValue: toFocus ? 1 : 0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(scaleVal, {
        toValue: toFocus ? 1.01 : 1,
        duration: 150,
        useNativeDriver: true,
      }),
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

  const animatePasswordIcon = (toVisible) => {
    Animated.sequence([
      Animated.timing(passwordIconOpacity, { toValue: 0, duration: 60, useNativeDriver: true }),
      Animated.timing(passwordIconOpacity, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleTogglePassword = () => {
    animatePasswordIcon(!showPassword);
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Enter both email and password.");
      triggerShake();
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err) {
      Alert.alert("Login failed", err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const pressIn = (scaleVal) => {
    Animated.timing(scaleVal, { toValue: 0.96, duration: 80, useNativeDriver: true }).start();
  };
  const pressOut = (scaleVal) => {
    Animated.spring(scaleVal, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const emailBorderColor = emailBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceBorder, colors.primary],
  });
  const passwordBorderColor = passwordBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceBorder, colors.primary],
  });

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
              Welcome back
            </Animated.Text>
            <Animated.Text
              style={[styles.welcomeSub, { opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslateY }] }]}
            >
              Log in to your rooms
            </Animated.Text>
          </View>

          <Animated.View
            style={{
              opacity: input1Opacity,
              transform: [{ translateY: input1TranslateY }, { translateX: shakeAnim }],
            }}
          >
            <Animated.View style={[styles.inputRow, { borderColor: emailBorderColor, transform: [{ scale: emailScale }] }]}>
              <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => { setEmailFocused(true); animateInput(emailBorder, emailScale, true); }}
                onBlur={() => { setEmailFocused(false); animateInput(emailBorder, emailScale, false); }}
              />
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={{
              opacity: input2Opacity,
              transform: [{ translateY: input2TranslateY }, { translateX: shakeAnim }],
            }}
          >
            <Animated.View style={[styles.inputRow, { borderColor: passwordBorderColor, transform: [{ scale: passwordScale }] }]}>
              <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => { setPasswordFocused(true); animateInput(passwordBorder, passwordScale, true); }}
                onBlur={() => { setPasswordFocused(false); animateInput(passwordBorder, passwordScale, false); }}
              />
              <TouchableOpacity onPress={handleTogglePassword} style={styles.eyeBtn} activeOpacity={0.6}>
                <Animated.View style={{ opacity: passwordIconOpacity }}>
                  {showPassword ? (
                    <EyeOff size={18} color={colors.textSecondary} />
                  ) : (
                    <Eye size={18} color={colors.textSecondary} />
                  )}
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.checkRow, { opacity: checkRowOpacity, transform: [{ translateY: checkRowTranslateY }] }]}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: btnOpacity, transform: [{ translateY: btnTranslateY }] }}>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
              onPressIn={() => pressIn(btnScale)}
              onPressOut={() => pressOut(btnScale)}
            >
              <Animated.View style={[styles.loginBtnInner, { transform: [{ scale: btnScale }] }]}>
                {loading ? (
                  <AnimatedSpinner size={20} color={colors.background} />
                ) : (
                  <Text style={styles.loginBtnText}>Log In</Text>
                )}
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.dividerRow, { opacity: socialOpacity, transform: [{ translateY: socialTranslateY }] }]}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or Continue With</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          <Animated.View style={[styles.socialRow, { opacity: socialOpacity, transform: [{ translateY: socialTranslateY }] }]}>
            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.8}
              onPressIn={() => pressIn(googleScale)}
              onPressOut={() => pressOut(googleScale)}
              onPress={() => Alert.alert("Coming soon", "Social login isn't set up yet.")}
            >
              <Animated.View style={[styles.socialBtnInner, { transform: [{ scale: googleScale }] }]}>
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialLabel}>Google</Text>
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.8}
              onPressIn={() => pressIn(appleScale)}
              onPressOut={() => pressOut(appleScale)}
              onPress={() => Alert.alert("Coming soon", "Social login isn't set up yet.")}
            >
              <Animated.View style={[styles.socialBtnInner, { transform: [{ scale: appleScale }] }]}>
                <Text style={styles.socialIcon}>🍎</Text>
                <Text style={styles.socialLabel}>Apple</Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign up</Text>
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
  checkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 2,
  },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: colors.background, fontSize: 12, fontWeight: "800" },
  rememberText: { color: colors.textSecondary, fontSize: 13 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  loginBtn: { marginBottom: 24 },
  loginBtnInner: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnText: { color: colors.background, fontWeight: "800", fontSize: 16 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.surfaceBorder },
  dividerText: { color: colors.textSecondary, fontSize: 12, fontWeight: "500" },
  socialRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  socialBtn: { flex: 1 },
  socialBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 14,
    height: 50,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  socialIcon: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  socialLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  footerLink: { color: colors.primary, fontSize: 14, fontWeight: "700" },
});
