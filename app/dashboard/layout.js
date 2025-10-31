import { authCheckAction } from "@/actions/auth";
import { redirect } from "next/navigation";
import DashboardMenu from "@/components/dashboard-menu";

export default async function DashboardLayout({ children }) {
  const result = await authCheckAction();

  if (!result.loggedIn) {
    redirect("/login");
  }

  return (
    <div>
      <DashboardMenu />
      {children}
    </div>
  );
}
