"use client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthContext } from "@/context/auth";
import { Loader2Icon } from "lucide-react";

export default function LoginPage() {
  const { user, setUser, handleLoginSubmit, loading } = useAuthContext();

  return (
    <div className="flex justify-center items-center h-screen -mt-10">
      <Card className="w-full max-w-md p-4 border-purple-500">
        <CardHeader>
          <CardTitle className="text-2xl text-red-800">Login</CardTitle>
          <CardDescription>Enter your email address to login</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <Input
              type="email"
              name="email"
              value={user?.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              placeholder="Email"
              className="col-span-3 border-purple-500"
              required
            />

            <Input
              type="password"
              name="password"
              value={user?.password}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
              placeholder="Password"
              className="col-span-3 border-purple-500"
              required
            />

            <Button
              disable={loading}
              type="submit"
              className="bg-red-800 text-white hover:bg-red-500"
            >
              {loading ? <Loader2Icon className="animate-spin" /> : ""} Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
