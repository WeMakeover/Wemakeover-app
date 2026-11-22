import { Outlet, ScrollRestoration } from "react-router-dom";
import ScrollToTop from "../../provider/ScrollToTop";

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ScrollToTop />
      <main className="flex-grow flex items-center justify-center px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
};

export default AuthLayout;