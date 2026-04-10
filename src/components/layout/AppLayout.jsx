import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout() {
  const [selectedTenant, setSelectedTenant] = useState(null);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="mr-[260px] transition-all duration-300">
        <TopBar selectedTenant={selectedTenant} onTenantChange={setSelectedTenant} />
        <main className="p-6">
          <Outlet context={{ selectedTenant, setSelectedTenant }} />
        </main>
      </div>
    </div>
  );
}