"use client";
import Link from "next/link";
import { useAuthContext } from "@/context/auth";

export default function DashboardMenu() {
  const { user, logout } = useAuthContext();

  return (
    <nav className="flex justify-between items-center p-2 border-b-2 border-green-700 text-green-800">
      <div>
        <h2 className="font-bold capitalize">G'day {user.name}</h2>
      </div>
      <div className="flex flex-wrap gap-3 mr-2">
        <Link href="/dashboard/generate-book">Generate Book</Link>
        <Link href="/dashboard/setttings">Settings</Link>
        <div className="hover:text-red-800 cursor-pointer" onClick={logout}>
          Logout
        </div>
      </div>
    </nav>
  );
}
