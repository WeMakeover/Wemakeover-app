import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Loader from "../components/common/Loader/loader.jsx";
import AuthLayout from "../components/layout/AuthLayout";
import AdminRoute from "./AdminRoute.jsx";
import AuthRoute from "./AuthRoute";
import ForgotPasswordRoute from "./ForgotPasswordRoute";
import VerifyEmailRoute from "./VerifyEmailRoute.jsx";

const NotFoundPage = lazy(() =>
  import("../pages/errorBoundaries/NotFoundPage")
);
const LoginPage = lazy(() => import("../components/common/auth/LoginPage"));
const EmailVerificationPage = lazy(() =>
  import("../pages/auth/EmailVerificationPage")
);
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage"));
const ForgotPasswordPage = lazy(() =>
  import("../components/common/auth/ForgotPasswordPage")
);
const AdminOnboarding = lazy(() => import("../pages/admin/AdminOnboarding"));
const PublicHomePage = lazy(() => import("../pages/home/PublicHomePage"));
const TermsAndConditions = lazy(() => import("../pages/home/TermsAndConditionsPage"));
const PrivacyPolicy = lazy(() => import("../pages/home/PrivacyPolicy"));

const AdminLayout = lazy(() => import("../components/layout/AdminLayout"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const BookingsAndCustomers = lazy(() => import("../pages/admin/BookingsAndCustomers"));
const AdminBookingDetails = lazy(() => import("../pages/admin/AdminBookingDetails"));
const AdminCitiesPage = lazy(() => import("../pages/admin/AdminCitiesPage"));
const AdminReviews = lazy(() => import("../pages/admin/AdminReviews"));
const AdminAdmins = lazy(() => import("../pages/admin/AdminAdmins"));
const CreateAdmin = lazy(() => import("../pages/admin/CreateAdmin"));
const UpdateAdmin = lazy(() => import("../pages/admin/UpdateAdmin"));
const AdminMobileServices = lazy(() => import("../pages/admin/AdminMobileServices"));
const MobileCategoryForm = lazy(() => import("../pages/admin/MobileCategoryForm"));
const AdminMobileCategoryServices = lazy(() => import("../pages/admin/AdminMobileCategoryServices"));
const MobileServiceForm = lazy(() => import("../pages/admin/MobileServiceForm"));
const AdminCoupons = lazy(() => import("../pages/admin/AdminCoupons"));
const CouponForm = lazy(() => import("../pages/admin/CouponForm"));
const AdminPopularNearYou = lazy(() => import("../pages/admin/AdminPopularNearYou"));

const LazyWrapper = ({ children }) => (
  <Suspense
    fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="large" useCustomGif text="Loading page..." />
      </div>
    }
  >
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <LazyWrapper>
        <PublicHomePage />
      </LazyWrapper>
    ),
  },
  {
    path: "/terms",
    element: (
      <LazyWrapper>
        <TermsAndConditions />
      </LazyWrapper>
    ),
  },
  {
    path: "/privacy",
    element: (
      <LazyWrapper>
        <PrivacyPolicy />
      </LazyWrapper>
    ),
  },
  {
    path: "/admin",
    element: <AdminRoute />,
    children: [
      {
        path: "",
        element: (
          <LazyWrapper>
            <AdminLayout />
          </LazyWrapper>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/admin/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: (
              <LazyWrapper>
                <AdminDashboard />
              </LazyWrapper>
            ),
          },
          {
            path: "services",
            element: (
              <LazyWrapper>
                <AdminMobileServices />
              </LazyWrapper>
            ),
          },
          {
            path: "services/categories/new",
            element: (
              <LazyWrapper>
                <MobileCategoryForm />
              </LazyWrapper>
            ),
          },
          {
            path: "services/categories/:categoryId/edit",
            element: (
              <LazyWrapper>
                <MobileCategoryForm />
              </LazyWrapper>
            ),
          },
          {
            path: "services/:categoryId",
            element: (
              <LazyWrapper>
                <AdminMobileCategoryServices />
              </LazyWrapper>
            ),
          },
          {
            path: "services/:categoryId/services/new",
            element: (
              <LazyWrapper>
                <MobileServiceForm />
              </LazyWrapper>
            ),
          },
          {
            path: "services/:categoryId/services/:serviceId/edit",
            element: (
              <LazyWrapper>
                <MobileServiceForm />
              </LazyWrapper>
            ),
          },
          {
            path: "mobile-services",
            element: <Navigate to="/admin/services" replace />,
          },
          {
            path: "mobile-services/*",
            element: <Navigate to="/admin/services" replace />,
          },
          {
            path: "bookings",
            element: (
              <LazyWrapper>
                <BookingsAndCustomers />
              </LazyWrapper>
            ),
          },
          {
            path: "bookings/:id",
            element: (
              <LazyWrapper>
                <AdminBookingDetails />
              </LazyWrapper>
            ),
          },
          {
            path: "coupons",
            element: (
              <LazyWrapper>
                <AdminCoupons />
              </LazyWrapper>
            ),
          },
          {
            path: "coupons/new",
            element: (
              <LazyWrapper>
                <CouponForm />
              </LazyWrapper>
            ),
          },
          {
            path: "coupons/:couponId/edit",
            element: (
              <LazyWrapper>
                <CouponForm />
              </LazyWrapper>
            ),
          },
          {
            path: "popular-near-you",
            element: (
              <LazyWrapper>
                <AdminPopularNearYou />
              </LazyWrapper>
            ),
          },
          {
            path: "cities",
            element: (
              <LazyWrapper>
                <AdminCitiesPage />
              </LazyWrapper>
            ),
          },
          {
            path: "city-requests",
            element: <Navigate to="/admin/cities?tab=requests" replace />,
          },
          {
            path: "reviews",
            element: (
              <LazyWrapper>
                <AdminReviews />
              </LazyWrapper>
            ),
          },
          {
            path: "admins",
            element: (
              <LazyWrapper>
                <AdminAdmins />
              </LazyWrapper>
            ),
          },
          {
            path: "admins/create",
            element: (
              <LazyWrapper>
                <CreateAdmin />
              </LazyWrapper>
            ),
          },
          {
            path: "admins/update/:id",
            element: (
              <LazyWrapper>
                <UpdateAdmin />
              </LazyWrapper>
            ),
          },
        ],
      },
    ],
  },
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      {
        element: <AuthRoute redirectTo="/admin/dashboard" />,
        children: [
          {
            path: "login",
            element: (
              <LazyWrapper>
                <LoginPage />
              </LazyWrapper>
            ),
          },
          {
            element: <ForgotPasswordRoute />,
            children: [
              {
                path: "forgot-password",
                element: (
                  <LazyWrapper>
                    <ForgotPasswordPage />
                  </LazyWrapper>
                ),
              },
            ],
          },
        ],
      },
      {
        element: <VerifyEmailRoute />,
        children: [
          {
            path: "verify-email",
            element: (
              <LazyWrapper>
                <EmailVerificationPage />
              </LazyWrapper>
            ),
          },
        ],
      },
      {
        path: "reset-password/:id/:token",
        element: (
          <LazyWrapper>
            <ResetPasswordPage />
          </LazyWrapper>
        ),
      },
      {
        path: "*",
        element: <Navigate to="/auth/login" replace />,
      },
    ],
  },
  {
    path: "/admin/onboard",
    element: (
      <LazyWrapper>
        <AdminOnboarding />
      </LazyWrapper>
    ),
  },
  {
    path: "*",
    element: (
      <LazyWrapper>
        <NotFoundPage />
      </LazyWrapper>
    ),
  },
]);
