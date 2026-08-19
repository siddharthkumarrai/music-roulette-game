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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

const ND = false;

function Spinner({ size = 20, color = colors.background }) {
  const r = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(r, { toValue: 1, duration: 900, useNativeDriver: ND })).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ rotate: r.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, borderTopColor: "transparent" }} />
    </Animated.View>
  );
}

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  const nameB = useRef(new Animated.Value(0)).current;
  const emailB = useRef(new Animated.Value(0)).current;
  const pwB = useRef(new Animated.Value(0)).current;
  const cfB = useRef(new Animated.Value(0)).current;
  const nameS = useRef(new Animated.Value(1)).current;
  const emailS = useRef(new Animated.Value(1)).current;
  const pwS = useRef(new Animated.Value(1)).current;
  const cfS = useRef(new Animated.Value(1)).current;
  const pwIconOp = useRef(new Animated.Value(1)).current;
  const cfIconOp = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const logoOp = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const tOp = useRef(new Animated.Value(0)).current;
  const tY = useRef(new Animated.Value(10)).current;
  const sOp = useRef(new Animated.Value(0)).current;
  const sY = useRef(new Animated.Value(10)).current;
  const i1Op = useRef(new Animated.Value(0)).current;
  const i1Y = useRef(new Animated.Value(10)).current;
  const i2Op = useRef(new Animated.Value(0)).current;
  const i2Y = useRef(new Animated.Value(10)).current;
  const i3Op = useRef(new Animated.Value(0)).current;
  const i3Y = useRef(new Animated.Value(10)).current;
  const i4Op = useRef(new Animated.Value(0)).current;
  const i4Y = useRef(new Animated.Value(10)).current;
  const bOp = useRef(new Animated.Value(0)).current;
  const bY = useRef(new Animated.Value(10)).current;
  const fOp = useRef(new Animated.Value(0)).current;
  const bScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const s = (o, y) => Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 350, useNativeDriver: ND }),
      Animated.timing(y, { toValue: 0, duration: 350, useNativeDriver: ND }),
    ]);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOp, { toValue: 1, duration: 300, useNativeDriver: ND }),
        Animated.spring(logoScale, { toValue: 1, friction: 7, useNativeDriver: ND }),
      ]),
      s(tOp, tY), Animated.delay(40),
      s(sOp, sY), Animated.delay(40),
      s(i1Op, i1Y), Animated.delay(60),
      s(i2Op, i2Y), Animated.delay(60),
      s(i3Op, i3Y), Animated.delay(60),
      s(i4Op, i4Y), Animated.delay(40),
      s(bOp, bY), Animated.delay(40),
      Animated.timing(fOp, { toValue: 1, duration: 300, useNativeDriver: ND }),
    ]).start();
  }, []);

  const focusAnim = (bv, sv, toFocus) => {
    Animated.parallel([
      Animated.timing(bv, { toValue: toFocus ? 1 : 0, duration: 150, useNativeDriver: ND }),
      Animated.timing(sv, { toValue: toFocus ? 1.01 : 1, duration: 150, useNativeDriver: ND }),
    ]).start();
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 6, duration: 40, useNativeDriver: ND }),
      Animated.timing(shake, { toValue: -6, duration: 40, useNativeDriver: ND }),
      Animated.timing(shake, { toValue: 4, duration: 40, useNativeDriver: ND }),
      Animated.timing(shake, { toValue: -4, duration: 40, useNativeDriver: ND }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: ND }),
    ]).start();
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirm) {
      Alert.alert("Missing info", "Fill in all fields.");
      triggerShake();
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      triggerShake();
      return;
    }
    if (password !== confirm) {
      setMismatch(true);
      Alert.alert("Passwords don't match", "Please make sure both passwords are the same.");
      triggerShake();
      return;
    }
    setMismatch(false);
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

  const pressIn = (sv) => Animated.timing(sv, { toValue: 0.96, duration: 80, useNativeDriver: ND }).start();
  const pressOut = (sv) => Animated.spring(sv, { toValue: 1, friction: 4, useNativeDriver: ND }).start();

  const mkB = (bv) => bv.interpolate({ inputRange: [0, 1], outputRange: [colors.surfaceBorder, colors.primary] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.inner, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={[styles.backBtn, { marginTop: 8 }]} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.logoSection}>
            <Animated.View style={[styles.logoMark, { opacity: logoOp, transform: [{ scale: logoScale }] }]}>
              <Text style={styles.logoEmoji}>🎵</Text>
            </Animated.View>
            <Animated.Text style={[styles.wordmark, { opacity: logoOp, transform: [{ scale: logoScale }] }]}>Music Roulette</Animated.Text>
          </View>

          <View style={styles.headingSection}>
            <Animated.Text style={[styles.welcomeTitle, { opacity: tOp, transform: [{ translateY: tY }] }]}>Create Account</Animated.Text>
            <Animated.Text style={[styles.welcomeSub, { opacity: sOp, transform: [{ translateY: sY }] }]}>Join or start your own listening rooms</Animated.Text>
          </View>

          <Animated.View style={{ opacity: i1Op, transform: [{ translateY: i1Y }, { translateX: shake }] }}>
            <Animated.View style={[styles.inputRow, { borderColor: mkB(nameB), transform: [{ scale: nameS }] }]}>
              <User size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={colors.textSecondary}
                value={name} onChangeText={setName}
                onFocus={() => focusAnim(nameB, nameS, true)} onBlur={() => focusAnim(nameB, nameS, false)} />
            </Animated.View>
          </Animated.View>

          <Animated.View style={{ opacity: i2Op, transform: [{ translateY: i2Y }, { translateX: shake }] }}>
            <Animated.View style={[styles.inputRow, { borderColor: mkB(emailB), transform: [{ scale: emailS }] }]}>
              <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor={colors.textSecondary}
                value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
                onFocus={() => focusAnim(emailB, emailS, true)} onBlur={() => focusAnim(emailB, emailS, false)} />
            </Animated.View>
          </Animated.View>

          <Animated.View style={{ opacity: i3Op, transform: [{ translateY: i3Y }, { translateX: shake }] }}>
            <Animated.View style={[styles.inputRow, { borderColor: mkB(pwB), transform: [{ scale: pwS }] }]}>
              <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Password (min 6 chars)" placeholderTextColor={colors.textSecondary}
                value={password} onChangeText={setPassword} secureTextEntry={!showPw}
                onFocus={() => focusAnim(pwB, pwS, true)} onBlur={() => focusAnim(pwB, pwS, false)} />
              <TouchableOpacity style={styles.eyeBtn} activeOpacity={0.6}
                onPress={() => { Animated.sequence([Animated.timing(pwIconOp, { toValue: 0, duration: 60, useNativeDriver: ND }), Animated.timing(pwIconOp, { toValue: 1, duration: 60, useNativeDriver: ND })]).start(); setShowPw(!showPw); }}>
                <Animated.View style={{ opacity: pwIconOp }}>
                  {showPw ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <Animated.View style={{ opacity: i4Op, transform: [{ translateY: i4Y }, { translateX: shake }] }}>
            <Animated.View style={[styles.inputRow, { borderColor: mismatch ? colors.danger : mkB(cfB), transform: [{ scale: cfS }] }]}>
              <Lock size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Confirm password" placeholderTextColor={colors.textSecondary}
                value={confirm} onChangeText={(t) => { setConfirm(t); if (mismatch) setMismatch(false); }} secureTextEntry={!showCf}
                onFocus={() => focusAnim(cfB, cfS, true)} onBlur={() => focusAnim(cfB, cfS, false)} />
              <TouchableOpacity style={styles.eyeBtn} activeOpacity={0.6}
                onPress={() => { Animated.sequence([Animated.timing(cfIconOp, { toValue: 0, duration: 60, useNativeDriver: ND }), Animated.timing(cfIconOp, { toValue: 1, duration: 60, useNativeDriver: ND })]).start(); setShowCf(!showCf); }}>
                <Animated.View style={{ opacity: cfIconOp }}>
                  {showCf ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
            {mismatch && <Text style={styles.errorText}>Passwords do not match</Text>}
          </Animated.View>

          <Animated.View style={{ opacity: bOp, transform: [{ translateY: bY }] }}>
            <TouchableOpacity style={styles.createBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.8}
              onPressIn={() => pressIn(bScale)} onPressOut={() => pressOut(bScale)}>
              <Animated.View style={[styles.createBtnInner, { transform: [{ scale: bScale }] }]}>
                {loading ? <Spinner size={20} color={colors.background} /> : <Text style={styles.createBtnText}>Create Account</Text>}
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.footer, { opacity: fOp }]}>
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
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
  logoSection: { alignItems: "center", marginTop: 28 },
  logoMark: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoEmoji: { fontSize: 36 },
  wordmark: { color: colors.primary, fontSize: 24, fontWeight: "800" },
  headingSection: { alignItems: "center", marginTop: 28, marginBottom: 24 },
  welcomeTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  welcomeSub: { color: colors.textSecondary, fontSize: 14 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, height: 54, marginBottom: 14 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: colors.textPrimary, fontSize: 15, height: "100%" },
  eyeBtn: { padding: 4, marginLeft: 8 },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "600", marginTop: -6, marginBottom: 10, marginLeft: 4 },
  createBtn: { marginTop: 8, marginBottom: 24 },
  createBtnInner: { backgroundColor: colors.primary, borderRadius: 14, height: 54, alignItems: "center", justifyContent: "center" },
  createBtnText: { color: colors.background, fontWeight: "800", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  footerLink: { color: colors.primary, fontSize: 14, fontWeight: "700" },
});
