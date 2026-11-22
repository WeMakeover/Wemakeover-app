# Figma Design System Rules — wemakeover

Rules for integrating Figma designs into this codebase via MCP. Primary mobile target: **`wemakeover-rn`** (Expo / React Native). Web client: **`client`** (React + Vite + Tailwind).

---

## 1. Token Definitions

### Mobile (`wemakeover-rn`)

Tokens live in a single theme module:

```js
// wemakeover-rn/src/theme/theme.js
export const colors = {
  primary: "#CC2B52",
  primaryDark: "#A31F40",
  text: "#1A1A1A",
  textDark: "#1E293B",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderMuted: "#E2E8F0",
  borderStrong: "#898A8D",
  background: "#FFFFFF",
  canvas: "#F8F8F8",
  surface: "#F7EBEE",
  homeIndicator: "#1C1C28",
  error: "#DC2626",
  success: "#16A34A",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, hero: 36, pill: 999 };
export const typography = {
  headingLg: { fontSize: 26, fontWeight: "700", lineHeight: 32 },
  body: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
};
```

- **Format:** Plain JS exports (no Style Dictionary / token pipeline).
- **Figma mapping:** `#CC2B52` primary, `#F8F8F8` canvas, `#898A8D` outline buttons, `#E2E8F0` SSO border, `#1E293B` secondary text.
- **Transformation:** None — map Figma hex values directly into `theme.js` when new screens are added.

### Web (`client`)

Tokens are split between Tailwind extensions and inline hex:

```js
// client/tailwind.config.js
colors: {
  beauty: {
    primary: '#CC2B52',
    'primary-light': '#E83A6A',
    'primary-dark': '#A82245',
    // ...
  }
}
```

Auth/forms also use raw `#CC2B52` in JSX. Prefer `beauty-primary` or a shared constant when adding new web UI.

---

## 2. Component Library

### Mobile

| Location | Role |
|----------|------|
| `wemakeover-rn/src/components/ui.js` | Shared primitives: `Screen`, `Heading`, `Field`, `Button`, `Card`, `Chip`, etc. |
| `wemakeover-rn/src/components/ServiceCard.js` | Domain card |
| `wemakeover-rn/src/components/BookSlot.js` | Booking slot picker |
| `wemakeover-rn/src/components/StarRating.js` | Star rating widget |

**Architecture:** Functional components + `StyleSheet.create`, theme imports from `../theme/theme`. Screens compose `ui.js` primitives; screen-specific layout stays in `src/screens/**`.

**Auth flow screens:** `src/screens/auth/` — `AuthWelcomeScreen` (Figma landing), `LoginScreen`, `RegisterScreen`, `OtpScreen`, etc.

**Storybook:** Not configured.

### Web

| Location | Role |
|----------|------|
| `client/src/components/ui/` | `Logo`, `CartDisplay`, cards |
| `client/src/components/common/` | Feature sections (auth forms, home, bookings) |
| `client/src/components/modals/` | Service & profile modals |

**Architecture:** React function components, Tailwind utility classes, Redux for state.

---

## 3. Frameworks & Libraries

### Mobile (`wemakeover-rn`)

- **Framework:** React 19 + React Native 0.85 (Expo SDK 56)
- **Navigation:** `@react-navigation/native`, native-stack, bottom-tabs
- **State:** Redux Toolkit + redux-persist
- **Styling:** React Native `StyleSheet` (no Tailwind on mobile)
- **Icons:** `@expo/vector-icons` (Ionicons)
- **Bundler:** Metro (Expo)

### Web (`client`)

- **Framework:** React + Vite
- **Styling:** Tailwind CSS 3, PostCSS
- **Fonts:** DM Sans, Inter, Syncopate (Tailwind `fontFamily`)
- **State:** Redux Toolkit

### Backend

- **Server:** Node/Express in `server/`
- **Auth API:** `server/src/routes/auth.routes.js`

---

## 4. Asset Management

### Mobile

```
wemakeover-rn/assets/
  auth/           # Figma-exported welcome screen assets
  mobile/         # Category images, etc.
  icon.png        # App icon (Expo)
```

- **Reference pattern:** `require("../../../assets/auth/hero.jpg")` for bundled images.
- **Figma MCP:** Use `get_design_context` / `download_assets`, save under `assets/<feature>/`, commit to repo (MCP URLs expire in ~7 days).
- **Optimization:** No dedicated pipeline; use appropriately sized exports from Figma (JPG for photos, PNG for logos/icons).
- **CDN:** Service/category images may load from API URLs at runtime; static UI chrome is bundled.

### Web

```
client/src/assets/
  Logo/
  loginHeader.jpg
  Gallery/
```

Imported as ES modules: `import loginHeader from "../../../assets/loginHeader.jpg"`.

---

## 5. Icon System

### Mobile

- **Library:** `@expo/vector-icons` → `Ionicons` (tab bar, buttons, empty states).
- **Usage:**

```js
import { Ionicons } from "@expo/vector-icons";
<Ionicons name="cart-outline" size={24} color={colors.text} />
```

- **Brand / SSO:** Raster assets in `assets/auth/` (e.g. `google-icon.png`, `logo.png`).
- **Naming:** Ionicons outline/filled pairs (`home-outline`, `person-outline`).

### Web

- **Library:** `react-icons` (`FcGoogle`, `FaEye`, etc.)
- **Brand logo:** Dynamic from API (`Logo.jsx` + site settings) or SVG in `client/src/assets/Logo/`

---

## 6. Styling Approach

### Mobile

- **Methodology:** Central theme tokens + per-screen `StyleSheet.create`.
- **Global styles:** None; `Screen` in `ui.js` sets default padding/background.
- **Responsive:** `useWindowDimensions()` for hero height; `useSafeAreaInsets()` for notches/home indicator.
- **Figma → RN checklist:**
  1. Replace Tailwind with `StyleSheet` + theme tokens.
  2. Replace `<div>` / `<img>` with `View` / `Image`.
  3. Use `borderRadius: radius.hero` (36) for hero bottom corners.
  4. Pill buttons: `borderRadius: radius.pill`, `paddingVertical: 12`.

### Web

- **Methodology:** Tailwind utilities + occasional inline styles.
- **Responsive:** `sm:`, `lg:` breakpoints; mobile-first layouts.
- **Primary CTA:** `bg-[#CC2B52]` or `beauty-primary`.

---

## 7. Project Structure

```
Wemakeover-app/
├── wemakeover-rn/          # Expo mobile app (primary Figma mobile target)
│   ├── App.js
│   ├── src/
│   │   ├── components/     # ui.js + domain widgets
│   │   ├── config/         # Static config (hero categories)
│   │   ├── features/       # Redux slices/thunks/api per domain
│   │   ├── hooks/
│   │   ├── lib/            # API client, push helpers
│   │   ├── navigation/     # RootNavigator, AuthStack, MainTabs
│   │   ├── screens/        # auth/, main/, account/
│   │   └── theme/          # Design tokens
│   └── assets/
├── client/                 # React web app
└── server/                 # Express API
```

### Navigation (mobile auth)

```
RootNavigator
  └── isAuthenticated ? MainTabs : AuthStack
        AuthStack (initial: Welcome)
          Welcome → Login | Register → Otp → ...
```

### Feature pattern (mobile)

Each feature under `src/features/<name>/`:

- `<name>Api.js` — HTTP calls via `apiFetch`
- `<name>Thunks.js` — async Redux thunks
- `<name>Slice.js` — Redux slice

Screens dispatch thunks; they do not call API modules directly.

---

## Figma MCP Workflow

1. **`get_design_context`** with `fileKey` + `nodeId` from URL (`74-1322` → `74:1322`).
2. **`download_assets`** for hero/logo/icons; save to `wemakeover-rn/assets/<screen>/`.
3. Implement screen in `src/screens/` using theme tokens and existing `ui.js` primitives.
4. Wire navigation in `src/navigation/`.
5. Extend `theme.js` only when Figma introduces new repeated tokens.

### Figma file reference

- **File:** `wemakeover.app`
- **File key:** `LHfbpcS0pAlK63qzK31tv2`
- **Auth welcome node:** `74:1322` (Login/Register landing)

---

## Code Connect

Not yet configured. For future mapping, add `.figma.ts` files alongside components per `figma-code-connect` skill.
