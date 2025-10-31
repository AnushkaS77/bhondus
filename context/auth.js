"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import {
  loginOrRegisterAction,
  authCheckAction,
  logoutAction,
} from "@/actions/auth";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

const AuthContext = createContext(undefined);

const initialState = {
  name: "",
  username: "",
  role: "",
  email: "",
  password: "",
  about: "",
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(initialState);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const res = await authCheckAction();
      // console.log("res in getCurrentUser in context ===> ", res);

      if (res.user) {
        setUser(res.user);
      }
      setLoggedIn(res.loggedIn);
    } catch (err) {
      console.log(err);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await loginOrRegisterAction(
        user.email || "",
        user.password || ""
      );

      if (res?.error) {
        setLoggedIn(false);
        toast.error(res.error);
        setLoading(false);
      } else {
        setUser(res.user);
        setLoggedIn(res.loggedIn);
        toast.success(`Welcome ${res.user.name}!`);
        // redirect
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error("Login failed. Try later");
      setLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutAction();
      setUser(initialState);
      setLoggedIn(false);
      toast.success("Logout successful");
    } catch (err) {
      toast.error("Logout failed.");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        handleLoginSubmit,
        loggedIn,
        logout,
        loading,
      }}
    >
      <Toaster />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
