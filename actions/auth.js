"use server";
import db from "@/utils/db";
import User from "@/models/user";
import { hashPassword, comparePassword } from "@/utils/auth";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const setAuthCookie = async (token) => {
  const cookieStore = await cookies();
  cookieStore.set("auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
};

export const authCheckAction = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value;

  if (!token) {
    return { loggedIn: false };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await db();

    const user = await User.findById(decoded._id).select("-password -__v");
    return { user: JSON.parse(JSON.stringify(user)), loggedIn: true };
  } catch (err) {
    return { loggedIn: false };
  }
};

export const loginOrRegisterAction = async (email, password) => {
  // console.log("email, password ===> ", email, password);

  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { error: "Invalid email", loggedIn: false };

  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters", loggedIn: false };
  }

  await db();

  let user = await User.findOne({ email });

  if (user) {
    const match = await comparePassword(password, user.password);
    console.log("password match ===> ", match);
    if (!match) return { error: "Invalid password", loggedIn: false };
  } else {
    // create user
    user = new User({
      email,
      password: await hashPassword(password),
      name: email.split("@")[0],
    });

    await user.save();
  }

  const { _id, name, role } = user;
  const token = generateToken({ _id, name, role, email });

  await setAuthCookie(token);

  return {
    user: { name, role, email },
    loggedIn: true,
  };
};

export const logoutAction = async () => {
  const cookieStore = await cookies();

  if (cookieStore.has("auth")) {
    cookieStore.delete("auth");
    return { message: "Successfully logged out" };
  }

  return { message: "No active session found" };
};
