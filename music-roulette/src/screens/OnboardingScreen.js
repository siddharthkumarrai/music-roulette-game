import React, { useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  interpolateColor,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SLIDES = [
  {
    id: "track",
    gradientColors: ["#FFA940", "#FF7A85"],
    icon: "🎵",
    title: "Drop Your Track",
    body: "Share one Song of the Day with your room, every single day.",
  },
  {
    id: "listen",
    gradientColors: ["#8B5CF6", "#6366F1"],
    icon: "🎧",
    title: "Listen & React",
    body: "Hear every friend's pick in full, rate it, and leave a real reaction.",
  },
  {
    id: "leaderboard",
    gradientColors: ["#EC4899", "#DB2777"],
    icon: "🏆",
    title: "Climb the Leaderboard",
    body: "Build streaks, earn points, and win real bragging rights weekly.",
  },
];

const AnimatedFlatList = Animated.FlatList;

function PaginationDot({ index, scrollX }) {
  const width = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    const w = interpolate(scrollX, inputRange, [6, 18, 6], "clamp");
    return { width: w };
  });

  const opacity = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
    const o = interpolate(scrollX, inputRange, [0.4, 1, 0.4], "clamp");
    return { opacity: o };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        width,
        opacity,
      ]}
    />
  );
}

function SlideItem({ item, index, scrollX }) {
  const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

  const iconStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollX, inputRange, [0.6, 1, 0.6], "clamp");
    const opacity = interpolate(scrollX, inputRange, [0, 1, 0], "clamp");
    const translateX = interpolate(scrollX, inputRange, [SCREEN_WIDTH * 0.3, 0, -SCREEN_WIDTH * 0.3], "clamp");
    return {
      transform: [{ scale }, { translateX }],
      opacity,
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollX, inputRange, [0, 1, 0], "clamp");
    const translateY = interpolate(scrollX, inputRange, [12, 0, 12], "clamp");
    return { opacity, transform: [{ translateY }] };
  });

  const bodyStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollX, inputRange, [0, 1, 0], "clamp");
    const translateY = interpolate(scrollX, inputRange, [12, 0, 12], "clamp");
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={styles.slideContainer}>
      <View style={styles.illustrationArea}>
        <View style={styles.iconBackdrop}>
          <Animated.Text style={[styles.iconEmoji, iconStyle]}>
            {item.icon}
          </Animated.Text>
        </View>
      </View>

      <View style={styles.paginationRow}>
        {SLIDES.map((_, i) => (
          <PaginationDot key={i} index={i} scrollX={scrollX} />
        ))}
      </View>

      <View style={styles.textArea}>
        <Animated.Text style={[styles.slideTitle, titleStyle]}>
          {item.title}
        </Animated.Text>
        <Animated.Text style={[styles.slideBody, bodyStyle]}>
          {item.body}
        </Animated.Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onMomentumScrollEnd = useCallback((event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  }, []);

  const backgroundStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      scrollX.value,
      [0, SCREEN_WIDTH, SCREEN_WIDTH * 2],
      ["#FFA940", "#8B5CF6", "#EC4899"]
    );
    return { backgroundColor: bgColor };
  });

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToOffset({
        offset: (currentIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  }, [currentIndex]);

  const handleFinish = useCallback(async () => {
    await AsyncStorage.setItem("has_seen_onboarding", "true");
    navigation.replace("Login");
  }, [navigation]);

  const handleSkip = useCallback(() => {
    handleFinish();
  }, [handleFinish]);

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.backgroundLayer, backgroundStyle]}>
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "transparent"]}
          style={styles.gradientOverlay}
        />
      </Animated.View>

      <View style={[styles.contentContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <AnimatedFlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => (
            <SlideItem item={item} index={index} scrollX={scrollX} />
          )}
        />

        <View style={[styles.bottomRow, { paddingHorizontal: 24, paddingBottom: 16 }]}>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <AnimatedPressable text="Skip" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isLastSlide ? handleFinish : handleNext}
            activeOpacity={0.7}
          >
            <AnimatedPressable
              text={isLastSlide ? "Get Started" : "Next"}
              showArrow
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function AnimatedPressable({ text, showArrow }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.buttonRow, animatedStyle]}>
      <Text style={styles.buttonText}>{text}</Text>
      {showArrow && <Text style={styles.arrowText}> →</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFA940",
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  contentContainer: {
    flex: 1,
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  illustrationArea: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.42,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBackdrop: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  iconEmoji: {
    fontSize: 80,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  textArea: {
    alignItems: "center",
    marginTop: 32,
    paddingHorizontal: 16,
  },
  slideTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  slideBody: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  arrowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
