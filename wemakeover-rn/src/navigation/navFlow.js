import { CommonActions } from "@react-navigation/native";

/**
 * Close a pushed screen and return to the previous one (standard app flow).
 * Never jumps to another tab.
 */
export function closeToPrevious(navigation, { fallbackScreen } = {}) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  if (fallbackScreen) {
    navigation.navigate(fallbackScreen);
  }
}

/**
 * When leaving a tab, drop leftover form screens so other tabs don't reopen mid-flow.
 * Example: edit address on Home, switch to Account — Account must show Account, not a stale form.
 */
export function createPopFormsOnBlurListener(tabName, formScreens = []) {
  const forms = new Set(formScreens);
  return ({ navigation }) => ({
    blur: () => {
      const tabState = navigation.getState();
      if (!tabState) return;

      const tabRoute = tabState.routes.find((r) => r.name === tabName);
      const stackState = tabRoute?.state;
      if (!stackState?.routes?.length) return;

      const active = stackState.routes[stackState.index ?? 0];
      if (!active || !forms.has(active.name)) return;

      const rootName = stackState.routes[0]?.name;
      if (!rootName) return;

      navigation.dispatch(
        CommonActions.reset({
          ...tabState,
          index: tabState.index,
          routes: tabState.routes.map((route) =>
            route.name === tabName
              ? {
                  name: tabName,
                  state: {
                    routes: [{ name: rootName }],
                    index: 0,
                  },
                }
              : route
          ),
        })
      );
    },
  });
}

/**
 * When opening a tab, if it is stuck on a form screen, show the tab root instead.
 */
export function createResetFormOnTabPressListener(tabName, formScreens = []) {
  const forms = new Set(formScreens);
  return ({ navigation }) => ({
    tabPress: (e) => {
      const tabState = navigation.getState();
      if (!tabState) return;

      const tabRoute = tabState.routes.find((r) => r.name === tabName);
      const stackState = tabRoute?.state;
      if (!stackState?.routes?.length) return;

      const active = stackState.routes[stackState.index ?? 0];
      if (!active || !forms.has(active.name)) return;

      e.preventDefault();
      const rootName = stackState.routes[0]?.name || "ProfileMain";
      const tabIndex = tabState.routes.findIndex((r) => r.name === tabName);

      navigation.dispatch(
        CommonActions.reset({
          ...tabState,
          index: tabIndex,
          routes: tabState.routes.map((route) =>
            route.name === tabName
              ? {
                  name: tabName,
                  state: {
                    routes: [{ name: rootName }],
                    index: 0,
                  },
                }
              : route
          ),
        })
      );
    },
  });
}
