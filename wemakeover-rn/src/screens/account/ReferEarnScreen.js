import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  RefreshControl,
  Linking,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { colors, spacing } from "../../theme/theme";
import { fonts } from "../../theme/fonts";
import { IconButton } from "../../components/ui";
import SheetOverlay from "../../components/SheetOverlay";
import { getMyReferralApi, claimMilestoneFacialApi } from "../../features/referrals/referralApi";
import { categoriesApi } from "../../features/categories/categoriesApi";
import { addToCart, selectCartItems } from "../../features/cart/cartSlice";
import { toCartItem } from "../../utils/serviceMapper";

const inviteFriendsIcon = require("../../../assets/home/invite-friends-icon.png");
const PINK = "#E83A6B";
const PINK_DEEP = "#CC2B52";
const PINK_SOFT = "#FFF0F3";
const PINK_MID = "#F7D4DC";
const INK = "#2A1A1F";
const CODE_BOX_BG = "#FAF7F4";
const CODE_BOX_BORDER = "#D0C8C0";
const PROGRESS_GOAL = 10;
const FALLBACK_FACIAL = {
  serviceName: "O3+ Cleanup",
  serviceType: "Premium",
  categoryName: "Facial & Cleanup",
};
const FALLBACK_BONUS_AMOUNT = 1500;

const MILESTONES = [
  {
    id: "facial",
    title: "Free Premium Facial",
    target: 5,
    icon: "sparkles",
    action: "add",
  },
  {
    id: "bonus",
    title: "₹1500 Bonus",
    target: 10,
    icon: "gift-outline",
    action: "apply",
  },
];

const FAQS = [
  {
    q: "How does the referral program work?",
    a: "Share your unique code. Your friend enters it when they register. After they complete their first booking, you both get WM Coins.",
  },
  {
    q: "When do I receive my rewards?",
    a: "Rewards are credited when your friend’s first booking status becomes completed — usually soon after that booking is finished.",
  },
  {
    q: "Is there a limit on referrals?",
    a: "No. You can invite as many friends as you like. Each successful referral earns you both the reward.",
  },
  {
    q: "How long are rewards valid?",
    a: "WM Coins stay on your account until they are used on eligible bookings. Check Account for your current balance.",
  },
];

function buildShareMessage(code, rewardAmount, link) {
  return [
    `Join me on WeMakeover! Use my code ${code} when you register.`,
    `We both get ₹${rewardAmount} WM Coins after your first completed booking.`,
    link || "",
  ]
    .filter(Boolean)
    .join("\n");
}

function FaqItem({ item, open, onToggle }) {
  return (
    <TouchableOpacity style={styles.faqRow} onPress={onToggle} activeOpacity={0.85}>
      <View style={styles.faqHead}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={PINK} />
      </View>
      {open ? <Text style={styles.faqA}>{item.a}</Text> : null}
    </TouchableOpacity>
  );
}

function ReferralProgressCard({
  invited,
  onAddFacial,
  addingFacial,
  facialClaimed,
  bonusClaimed,
  bonusAmount,
}) {
  const count = Math.max(0, Number(invited) || 0);
  const pct = Math.min(100, Math.round((count / PROGRESS_GOAL) * 100));

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.progressTitle}>Referral Progress</Text>
          <Text style={styles.progressSub}>
            <Text style={styles.progressCount}>{count}</Text>
            {` / ${PROGRESS_GOAL} friends invited`}
          </Text>
        </View>
        <View style={styles.progressBadge}>
          <Ionicons name="sparkles" size={12} color={PINK} />
          <Text style={styles.progressBadgeText}>{pct}% Completed</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>

      <View style={styles.milestoneList}>
        {MILESTONES.map((m) => {
          const unlocked = count >= m.target;
          const isBonus = m.action === "apply";
          const isFacial = m.action === "add";
          const title = isBonus ? `₹${bonusAmount || FALLBACK_BONUS_AMOUNT} Bonus` : m.title;
          const showClaimed =
            (isBonus && unlocked) || (isFacial && unlocked && facialClaimed);
          const showAdd = isFacial && unlocked && !facialClaimed;
          return (
            <View key={m.id} style={styles.milestoneRow}>
              <View style={styles.milestoneIcon}>
                <Ionicons name={m.icon} size={18} color={PINK} />
              </View>
              <View style={styles.milestoneBody}>
                <Text style={styles.milestoneTitle}>{title}</Text>
                <Text style={styles.milestoneSub}>Invite {m.target} Friends</Text>
              </View>
              {!unlocked ? (
                <View style={styles.milestoneTag}>
                  <Text style={styles.milestoneTagText}>Upcoming</Text>
                </View>
              ) : showClaimed ? (
                <View style={[styles.milestoneTag, styles.milestoneTagClaimed]}>
                  <Text style={[styles.milestoneTagText, styles.milestoneTagTextClaimed]}>
                    Claimed
                  </Text>
                </View>
              ) : showAdd ? (
                <TouchableOpacity
                  style={styles.milestoneAction}
                  onPress={onAddFacial}
                  activeOpacity={0.85}
                  disabled={addingFacial}
                >
                  {addingFacial ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.milestoneActionText}>Add</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.milestoneTag}>
                  <Text style={styles.milestoneTagText}>Unlocked</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ShareSheet({ visible, onClose, code, rewardAmount, shareUrl, webShareUrl }) {
  const message = useMemo(
    () => buildShareMessage(code, rewardAmount, shareUrl || webShareUrl),
    [code, rewardAmount, shareUrl, webShareUrl]
  );
  const link = shareUrl || webShareUrl || "";

  const openShare = async (channel) => {
    try {
      if (channel === "whatsapp") {
        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
        const can = await Linking.canOpenURL(url);
        if (can) {
          await Linking.openURL(url);
          onClose();
          return;
        }
        Toast.show({ type: "info", text1: "WhatsApp not available", text2: "Opening system share instead." });
      }
      if (channel === "sms") {
        const smsUrl =
          Platform.OS === "ios"
            ? `sms:&body=${encodeURIComponent(message)}`
            : `sms:?body=${encodeURIComponent(message)}`;
        await Linking.openURL(smsUrl);
        onClose();
        return;
      }
      if (channel === "copy") {
        await Share.share({ message: link || code, title: "Referral link" });
        Toast.show({ type: "success", text1: "Link ready", text2: link || code });
        onClose();
        return;
      }
      // Instagram / Facebook / default → system share sheet
      await Share.share({ message, title: "Refer & Earn — WeMakeover" });
      onClose();
    } catch {
      // dismissed
    }
  };

  const channels = [
    { id: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp", color: "#25D366" },
    { id: "sms", label: "SMS", icon: "chatbubble-ellipses-outline", color: "#6B7280" },
    { id: "instagram", label: "Instagram", icon: "logo-instagram", color: "#E1306C" },
    { id: "facebook", label: "Facebook", icon: "logo-facebook", color: "#1877F2" },
    { id: "copy", label: "Copy Link", icon: "link-outline", color: "#6B7280" },
  ];

  return (
    <SheetOverlay visible={visible} onClose={onClose}>
      <View style={styles.shareSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.shareSheetTitle}>Invite Friends For Exciting Benefits</Text>
        <Text style={styles.shareVia}>Share Via</Text>
        <View style={styles.shareRow}>
          {channels.map((ch) => (
            <TouchableOpacity
              key={ch.id}
              style={styles.shareItem}
              onPress={() => openShare(ch.id)}
              activeOpacity={0.85}
            >
              <View style={styles.shareIconWrap}>
                <Ionicons name={ch.icon} size={26} color={ch.color} />
              </View>
              <Text style={styles.shareLabel}>{ch.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.sheetClose} onPress={onClose} activeOpacity={0.85}>
          <Text style={styles.sheetCloseText}>Close</Text>
        </TouchableOpacity>
      </View>
    </SheetOverlay>
  );
}

export default function ReferEarnScreen({ navigation }) {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [addingFacial, setAddingFacial] = useState(false);

  const load = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getMyReferralApi();
      setProfile(data);
      if (data?.milestones?.bonus?.justCredited) {
        const amt = data.milestones.bonus.amount ?? FALLBACK_BONUS_AMOUNT;
        Toast.show({
          type: "success",
          text1: `₹${amt} WM Coins added`,
          text2: "10-invite bonus credited to your wallet.",
        });
      }
    } catch (err) {
      setError(err?.message || "Failed to load Refer & Earn");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load({ silent: true });
  };

  const rewardAmount = profile?.rewardAmountEach ?? 200;
  const code = profile?.referralCode || "";
  const shareUrl = profile?.shareUrl || "";
  const webShareUrl = profile?.webShareUrl || "";
  const stats = profile?.stats || { pending: 0, rewarded: 0, totalInvites: 0 };
  const invitedCount = profile?.milestones?.invited ?? stats.totalInvites ?? 0;
  const facialMeta = profile?.milestones?.facial || FALLBACK_FACIAL;
  const facialClaimed = Boolean(facialMeta.claimed);
  const bonusMeta = profile?.milestones?.bonus || {
    amount: FALLBACK_BONUS_AMOUNT,
    claimed: false,
  };
  const bonusAmount = bonusMeta.amount ?? FALLBACK_BONUS_AMOUNT;
  const bonusClaimed = Boolean(bonusMeta.claimed);

  const howItWorks = [
    {
      icon: "people-outline",
      title: "Invite Friends",
      body: "Share your unique referral code or link with friends via WhatsApp, Instagram, or any channel.",
    },
    {
      icon: "star-outline",
      title: "Friend Books First Service",
      body: "Your friend signs up and completes their first WeMakeover booking using your code.",
    },
    {
      icon: "gift-outline",
      title: `Both Earn ₹${rewardAmount} Rewards`,
      body: `You both receive ₹${rewardAmount} credited as WM Coins after their first booking is completed. Unlimited referrals!`,
    },
  ];

  const onCopyCode = async () => {
    if (!code) return;
    try {
      await Share.share({ message: code, title: "Referral code" });
      Toast.show({ type: "success", text1: "Code ready to copy/share", text2: code });
    } catch {
      Toast.show({ type: "info", text1: "Your code", text2: code });
    }
  };

  const onAddFacial = async () => {
    if (addingFacial || facialClaimed) return;
    const serviceName = facialMeta.serviceName || FALLBACK_FACIAL.serviceName;
    const serviceType = facialMeta.serviceType || FALLBACK_FACIAL.serviceType;
    const categoryName = facialMeta.categoryName || FALLBACK_FACIAL.categoryName;

    setAddingFacial(true);
    try {
      const claimRes = await claimMilestoneFacialApi();
      if (!claimRes?.success && !claimRes?.data?.claimed && !claimRes?.alreadyClaimed) {
        // http may throw on 409; handle success path below
      }
      if (claimRes?.success || claimRes?.data?.claimed) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                milestones: {
                  ...prev.milestones,
                  facial: {
                    ...(prev.milestones?.facial || {}),
                    claimed: true,
                  },
                },
              }
            : prev
        );
      }

      const catsRes = await categoriesApi.getAllCategories();
      const categories = Array.isArray(catsRes?.data)
        ? catsRes.data
        : catsRes?.data?.categories || [];
      const category = categories.find(
        (c) =>
          c.name === categoryName ||
          c.name === "Facial & Clean-up" ||
          c.slug === "facial-cleanup"
      );
      if (!category) {
        Toast.show({
          type: "error",
          text1: "Category unavailable",
          text2: `${categoryName} could not be found.`,
        });
        return;
      }

      const catId = category._id || category.id;
      const res = await categoriesApi.getCategoryServices(catId);
      const list = res?.data?.services || [];
      const match =
        list.find(
          (s) =>
            s.name === serviceName &&
            String(s.serviceType || "").toLowerCase() === String(serviceType).toLowerCase()
        ) || list.find((s) => s.name === serviceName);

      if (!match) {
        Toast.show({
          type: "error",
          text1: "Service unavailable",
          text2: `${serviceName} could not be found. Try again later.`,
        });
        return;
      }

      const alreadyFree = cartItems.some(
        (item) =>
          item.cardHeader === serviceName &&
          Number(item.price) === 0 &&
          String(item.description || "").includes("Referral reward")
      );
      if (!alreadyFree) {
        const cartItem = {
          ...toCartItem(match),
          price: 0,
          description: `Referral reward — Free ${serviceName}`,
          isReferralReward: true,
        };
        dispatch(addToCart(cartItem));
      }

      Toast.show({
        type: "success",
        text1: "Added to cart",
        text2: `${serviceName} added free — this reward is now claimed.`,
      });
    } catch (err) {
      const already = err?.status === 409 || /already claimed/i.test(err?.message || "");
      if (already) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                milestones: {
                  ...prev.milestones,
                  facial: {
                    ...(prev.milestones?.facial || {}),
                    claimed: true,
                  },
                },
              }
            : prev
        );
        Toast.show({
          type: "info",
          text1: "Already claimed",
          text2: "Free Premium Facial can only be used once.",
        });
        return;
      }
      Toast.show({
        type: "error",
        text1: "Could not add service",
        text2: err?.message || "Please try again.",
      });
    } finally {
      setAddingFacial(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading && !profile ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PINK} />
        </View>
      ) : error && !profile ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.85}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} />
          }
        >
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={[styles.blob, styles.blobOne]} />
            <View style={[styles.blob, styles.blobTwo]} />
            <View style={styles.badge}>
              <Ionicons name="star" size={12} color={PINK} />
              <Text style={styles.badgeText}>Exclusive Offer</Text>
            </View>
            <Text style={styles.heroHeadline}>Invite Friends.</Text>
            <Text style={styles.heroHeadline}>Pamper Together.</Text>
            <Text style={styles.heroOffer}>
              Give ₹{rewardAmount} · Get ₹{rewardAmount}
            </Text>
            <Text style={styles.heroSub}>You both earn rewards after their first booking.</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShareOpen(true)}
              style={styles.heroCtaWrap}
            >
              <LinearGradient
                colors={["#FF4F7B", PINK, PINK_DEEP]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.heroCta}
              >
                <Image source={inviteFriendsIcon} style={styles.heroCtaIcon} resizeMode="contain" />
                <Text style={styles.heroCtaText}>Invite Friends</Text>
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.heroFigures} pointerEvents="none">
              <View style={[styles.figure, styles.figureBack]} />
              <View style={[styles.figure, styles.figureFront]} />
            </View>
          </View>

          {/* Code card */}
          <View style={styles.card}>
            <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText} selectable>
                {code || "—"}
              </Text>
              <TouchableOpacity style={styles.copyChip} onPress={onCopyCode} activeOpacity={0.85}>
                <Ionicons name="copy-outline" size={14} color={PINK_DEEP} />
                <Text style={styles.copyChipText}>Copy</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setShareOpen(true)}>
              <LinearGradient
                colors={[PINK_DEEP, PINK]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.shareCodeBtn}
              >
                <Ionicons name="share-social-outline" size={18} color="#fff" />
                <Text style={styles.shareCodeBtnText}>Share My Code</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <ReferralProgressCard
            invited={invitedCount}
            onAddFacial={onAddFacial}
            addingFacial={addingFacial}
            facialClaimed={facialClaimed}
            bonusClaimed={bonusClaimed}
            bonusAmount={bonusAmount}
          />

          {/* How it works */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            {howItWorks.map((item, index) => (
              <View key={item.title} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  <View style={styles.stepIcon}>
                    <Ionicons name={item.icon} size={18} color={PINK} />
                  </View>
                  {index < howItWorks.length - 1 ? <View style={styles.stepLine} /> : null}
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>
                    Step {index + 1}: <Text style={styles.stepTitleEm}>{item.title}</Text>
                  </Text>
                  <Text style={styles.stepText}>{item.body}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* FAQs */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>FAQ&apos;s</Text>
            {FAQS.map((item, index) => (
              <View key={item.q}>
                <FaqItem
                  item={item}
                  open={openFaq === index}
                  onToggle={() => setOpenFaq((cur) => (cur === index ? null : index))}
                />
                {index < FAQS.length - 1 ? <View style={styles.faqDivider} /> : null}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <ShareSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        code={code}
        rewardAmount={rewardAmount}
        shareUrl={shareUrl}
        webShareUrl={webShareUrl}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F4F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md + 6,
    minHeight: 60,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 18,
    fontWeight: "600",
    color: INK,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    fontFamily: fonts.interMedium,
    fontSize: 14,
    color: colors.errorStrong,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: PINK,
  },
  retryText: {
    fontFamily: fonts.poppinsSemiBold,
    color: "#fff",
    fontSize: 14,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: PINK_SOFT,
    borderRadius: 28,
    padding: spacing.lg,
    paddingBottom: 22,
    overflow: "hidden",
    minHeight: 240,
    marginTop: 0,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: PINK_MID,
    opacity: 0.55,
  },
  blobOne: {
    width: 180,
    height: 180,
    right: -40,
    top: -30,
  },
  blobTwo: {
    width: 120,
    height: 120,
    right: 40,
    bottom: -20,
    opacity: 0.35,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "transparent",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D0D6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
  },
  badgeText: {
    fontFamily: fonts.interSemiBold,
    fontSize: 11,
    color: PINK,
  },
  heroHeadline: {
    fontFamily: fonts.playfairBold,
    fontSize: 26,
    lineHeight: 32,
    color: INK,
    letterSpacing: -0.4,
    maxWidth: "72%",
  },
  heroOffer: {
    marginTop: 10,
    fontFamily: fonts.playfairBold,
    fontSize: 20,
    color: PINK,
  },
  heroSub: {
    marginTop: 6,
    fontFamily: fonts.interRegular,
    fontSize: 13,
    lineHeight: 18,
    color: "#5C4A50",
    maxWidth: "70%",
  },
  heroCtaWrap: {
    marginTop: 18,
    alignSelf: "flex-start",
    shadowColor: PINK_DEEP,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 48,
  },
  heroCtaIcon: {
    width: 20,
    height: 20,
    tintColor: "#FFFFFF",
  },
  heroCtaText: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 14,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  heroFigures: {
    position: "absolute",
    right: 18,
    bottom: 18,
    width: 88,
    height: 100,
  },
  figure: {
    position: "absolute",
    width: 44,
    height: 72,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  figureBack: {
    right: 0,
    bottom: 0,
    backgroundColor: "#E8B7C3",
  },
  figureFront: {
    right: 28,
    bottom: 0,
    backgroundColor: "#F6E6EA",
    borderWidth: 2,
    borderColor: "#E4C5CE",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: spacing.lg,
  },
  codeLabel: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: PINK,
    marginBottom: 10,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    backgroundColor: CODE_BOX_BG,
    borderWidth: 1,
    borderColor: CODE_BOX_BORDER,
    borderStyle: "dashed",
  },
  codeText: {
    flex: 1,
    fontFamily: fonts.poppinsBold,
    fontSize: 20,
    letterSpacing: 1.5,
    color: INK,
  },
  copyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8E6EB",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyChipText: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
    color: PINK_DEEP,
  },
  shareCodeBtn: {
    height: 48,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareCodeBtnText: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: spacing.lg,
    shadowColor: "#2A1A1F",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },
  progressTitle: {
    fontFamily: fonts.playfairBold,
    fontSize: 20,
    color: INK,
    marginBottom: 4,
  },
  progressSub: {
    fontFamily: fonts.poppinsRegular,
    fontSize: 13,
    color: "#9A8A90",
  },
  progressCount: {
    fontFamily: fonts.poppinsSemiBold,
    color: PINK,
  },
  progressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PINK_SOFT,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  progressBadgeText: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 11,
    color: PINK,
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "#EEE6E8",
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: PINK,
  },
  milestoneList: {
    gap: 10,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: CODE_BOX_BG,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PINK_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneBody: {
    flex: 1,
  },
  milestoneTitle: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 14,
    color: INK,
  },
  milestoneSub: {
    fontFamily: fonts.poppinsRegular,
    fontSize: 12,
    color: "#9A8A90",
    marginTop: 2,
  },
  milestoneTag: {
    backgroundColor: "#EDE7E8",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  milestoneTagClaimed: {
    backgroundColor: PINK_SOFT,
  },
  milestoneTagText: {
    fontFamily: fonts.poppinsMedium,
    fontSize: 11,
    color: "#8A7A80",
  },
  milestoneTagTextClaimed: {
    color: PINK,
  },
  milestoneAction: {
    backgroundColor: PINK,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneActionText: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 12,
    color: "#FFFFFF",
  },
  sectionTitle: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 17,
    color: INK,
    marginBottom: spacing.md,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
  },
  stepRail: {
    width: 40,
    alignItems: "center",
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PINK_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: PINK_MID,
    marginVertical: 4,
  },
  stepBody: {
    flex: 1,
    paddingBottom: 18,
  },
  stepTitle: {
    fontFamily: fonts.interMedium,
    fontSize: 14,
    color: INK,
  },
  stepTitleEm: {
    fontFamily: fonts.poppinsSemiBold,
    color: INK,
  },
  stepText: {
    marginTop: 4,
    fontFamily: fonts.interRegular,
    fontSize: 13,
    lineHeight: 19,
    color: "#6E5C62",
  },
  faqRow: {
    paddingVertical: 12,
  },
  faqHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  faqQ: {
    flex: 1,
    fontFamily: fonts.interSemiBold,
    fontSize: 14,
    color: INK,
  },
  faqA: {
    marginTop: 8,
    fontFamily: fonts.interRegular,
    fontSize: 13,
    lineHeight: 19,
    color: "#6E5C62",
  },
  faqDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#EDE4E7",
  },
  shareSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E5E5",
    marginBottom: 14,
  },
  shareSheetTitle: {
    fontFamily: fonts.poppinsBold,
    fontSize: 18,
    color: PINK,
    marginBottom: 10,
  },
  shareVia: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 15,
    color: INK,
    marginBottom: 16,
  },
  shareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  shareItem: {
    width: "18%",
    alignItems: "center",
    gap: 8,
  },
  shareIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  shareLabel: {
    fontFamily: fonts.interMedium,
    fontSize: 10,
    color: "#555",
    textAlign: "center",
  },
  sheetClose: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sheetCloseText: {
    fontFamily: fonts.interSemiBold,
    fontSize: 14,
    color: "#8A7A80",
  },
});
