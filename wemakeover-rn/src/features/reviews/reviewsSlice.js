import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { reviewsApi } from "./reviewsApi";

// `http` already unwraps to the response body, so thunks return the body directly.

export const submitReview = createAsyncThunk(
  "reviews/submit",
  async (reviewData, { rejectWithValue }) => {
    try {
      return await reviewsApi.submitReview(reviewData);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to submit review");
    }
  }
);

export const fetchPendingReviews = createAsyncThunk(
  "reviews/fetchPending",
  async (_, { rejectWithValue }) => {
    try {
      return await reviewsApi.getPendingReviews();
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch pending reviews");
    }
  }
);

export const fetchMyReviews = createAsyncThunk(
  "reviews/fetchMine",
  async (params, { rejectWithValue }) => {
    try {
      return await reviewsApi.getMyReviews(params);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch reviews");
    }
  }
);

export const editReview = createAsyncThunk(
  "reviews/edit",
  async ({ reviewId, updates }, { rejectWithValue }) => {
    try {
      return await reviewsApi.editReview(reviewId, updates);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to edit review");
    }
  }
);

const initialState = {
  submission: { loading: false, error: null, success: false, data: null },
  pendingReviews: { loading: false, error: null, bookings: [], count: 0 },
  myReviews: {
    loading: false,
    error: null,
    reviews: [],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalReviews: 0,
      hasNextPage: false,
      hasPrevPage: false,
    },
  },
  editing: { loading: false, error: null, success: false },
};

const reviewsSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {
    resetSubmission: (state) => {
      state.submission = initialState.submission;
    },
    resetEditing: (state) => {
      state.editing = initialState.editing;
    },
    clearErrors: (state) => {
      state.submission.error = null;
      state.pendingReviews.error = null;
      state.myReviews.error = null;
      state.editing.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitReview.pending, (state) => {
        state.submission.loading = true;
        state.submission.error = null;
        state.submission.success = false;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.submission.loading = false;
        state.submission.success = true;
        state.submission.data = action.payload?.data;
        if (state.pendingReviews.count > 0) state.pendingReviews.count -= 1;
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.submission.loading = false;
        state.submission.error = action.payload;
        state.submission.success = false;
      })

      .addCase(fetchPendingReviews.pending, (state) => {
        state.pendingReviews.loading = true;
        state.pendingReviews.error = null;
      })
      .addCase(fetchPendingReviews.fulfilled, (state, action) => {
        state.pendingReviews.loading = false;
        state.pendingReviews.bookings = action.payload?.data?.bookings || [];
        state.pendingReviews.count = action.payload?.data?.count || 0;
      })
      .addCase(fetchPendingReviews.rejected, (state, action) => {
        state.pendingReviews.loading = false;
        state.pendingReviews.error = action.payload;
      })

      .addCase(fetchMyReviews.pending, (state) => {
        state.myReviews.loading = true;
        state.myReviews.error = null;
      })
      .addCase(fetchMyReviews.fulfilled, (state, action) => {
        state.myReviews.loading = false;
        state.myReviews.reviews = action.payload?.data?.reviews || [];
        state.myReviews.pagination =
          action.payload?.data?.pagination || initialState.myReviews.pagination;
      })
      .addCase(fetchMyReviews.rejected, (state, action) => {
        state.myReviews.loading = false;
        state.myReviews.error = action.payload;
      })

      .addCase(editReview.pending, (state) => {
        state.editing.loading = true;
        state.editing.error = null;
        state.editing.success = false;
      })
      .addCase(editReview.fulfilled, (state, action) => {
        state.editing.loading = false;
        state.editing.success = true;
        const updatedReview = action.payload?.data;
        if (!updatedReview) return;
        const id = updatedReview.reviewId || updatedReview._id;
        const index = state.myReviews.reviews.findIndex(
          (r) => (r._id && r._id === id) || (r.reviewId && r.reviewId === id)
        );
        if (index !== -1) {
          state.myReviews.reviews[index] = {
            ...state.myReviews.reviews[index],
            rating: updatedReview.rating,
            comment: updatedReview.comment,
            isEdited: updatedReview.isEdited,
            editedAt: updatedReview.editedAt,
            editWindowExpiresAt: updatedReview.editWindowExpiresAt,
          };
        }
      })
      .addCase(editReview.rejected, (state, action) => {
        state.editing.loading = false;
        state.editing.error = action.payload;
        state.editing.success = false;
      });
  },
});

export const { resetSubmission, resetEditing, clearErrors } = reviewsSlice.actions;

export const selectSubmission = (state) => state.reviews.submission;
export const selectPendingReviews = (state) => state.reviews.pendingReviews;
export const selectMyReviews = (state) => state.reviews.myReviews;
export const selectEditing = (state) => state.reviews.editing;

export default reviewsSlice.reducer;
