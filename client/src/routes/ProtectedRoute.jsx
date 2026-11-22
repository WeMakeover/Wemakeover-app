/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import Loader from "../components/common/Loader/loader";
import { checkLoginStatus } from "../features/auth/authThunks";

const ProtectedRoute = ({ redirectTo = "/auth/login" }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, status } = useSelector((state) => state.auth);

  // Re-verify session when status is idle (e.g. after login page unmount reset)
  useEffect(() => {
    if (status === "idle") {
      dispatch(checkLoginStatus());
    }
  }, [dispatch, status]);

  // Wait until login check finishes
  if (status === "loading" || status === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader size="large" useCustomGif text="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
