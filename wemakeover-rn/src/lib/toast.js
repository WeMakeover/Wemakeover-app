import Toast from "react-native-toast-message";

/**
 * Shim that mirrors the `react-hot-toast` API used across the ported slices,
 * so `import toast from "../../lib/toast"` works as a drop-in replacement.
 */
const toast = {
  success: (message) => Toast.show({ type: "success", text1: String(message ?? "") }),
  error: (message) => Toast.show({ type: "error", text1: String(message ?? "") }),
  loading: (message) => Toast.show({ type: "info", text1: String(message ?? "Loading...") }),
  dismiss: () => Toast.hide(),
};

export default toast;
export { toast };
