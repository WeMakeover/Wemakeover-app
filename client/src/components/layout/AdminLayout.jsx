import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import AdminHeader from "../admin/layout/AdminHeader";

/**
 * AdminLayout - Layout wrapper for all admin pages
 * Similar to AppLayout but without Footer
 * Contains AdminHeader + main content area
 */
const AdminLayout = () => {
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    const previous = meta.getAttribute("content");
    meta.setAttribute("content", "noindex, nofollow");
    return () => {
      if (created) meta.remove();
      else if (previous) meta.setAttribute("content", previous);
      else meta.remove();
    };
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-col bg-gray-50">
      <AdminHeader />
      <main className="flex-1 w-full pt-20 lg:pt-24">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
