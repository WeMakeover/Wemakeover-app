import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { notificationsApi } from "./notificationsApi";

// `http` already unwraps to the response body, so thunks return the body directly.

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      return await notificationsApi.getNotifications(params);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch notifications");
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      return await notificationsApi.getUnreadCount();
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch unread count");
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  "notifications/markAsRead",
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await notificationsApi.markAsRead(notificationId);
      return { notificationId, ...response };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to mark notification as read");
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  "notifications/markAllAsRead",
  async (_, { rejectWithValue }) => {
    try {
      return await notificationsApi.markAllAsRead();
    } catch (error) {
      return rejectWithValue(error.message || "Failed to mark all as read");
    }
  }
);

export const deleteNotification = createAsyncThunk(
  "notifications/delete",
  async (notificationId, { rejectWithValue }) => {
    try {
      await notificationsApi.deleteNotification(notificationId);
      return { notificationId };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete notification");
    }
  }
);

const initialState = {
  notifications: [],
  unreadCount: 0,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
  loading: false,
  countLoading: false,
  error: null,
};

const idOf = (n) => n.id || n._id;

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetNotifications: () => initialState,
    decrementUnreadCount: (state) => {
      if (state.unreadCount > 0) state.unreadCount -= 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload?.data?.notifications || [];
        state.pagination = action.payload?.data?.pagination || initialState.pagination;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchUnreadCount.pending, (state) => {
        state.countLoading = true;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.countLoading = false;
        state.unreadCount = action.payload?.data?.unreadCount || 0;
      })
      .addCase(fetchUnreadCount.rejected, (state) => {
        state.countLoading = false;
      })

      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const { notificationId } = action.payload;
        const notification = state.notifications.find((n) => idOf(n) === notificationId);
        if (notification && !notification.isRead) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          if (state.unreadCount > 0) state.unreadCount -= 1;
        }
      })

      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: n.readAt || new Date().toISOString(),
        }));
        state.unreadCount = 0;
      })

      .addCase(deleteNotification.fulfilled, (state, action) => {
        const { notificationId } = action.payload;
        const notification = state.notifications.find((n) => idOf(n) === notificationId);
        if (notification && !notification.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter((n) => idOf(n) !== notificationId);
      });
  },
});

export const { clearError, resetNotifications, decrementUnreadCount } =
  notificationsSlice.actions;

export const selectNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationsLoading = (state) => state.notifications.loading;
export const selectNotificationsPagination = (state) => state.notifications.pagination;

export default notificationsSlice.reducer;
