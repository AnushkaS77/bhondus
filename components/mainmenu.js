"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuthContext } from "@/context/auth";

export default function MainMenu() {
  const { user, loggedIn } = useAuthContext();

  return (
    <nav className="flex flex-wrap justify-between items-center pb-2 border-b-2 border-purple-700 text-purple-800 text-lg gap-2">
      <Link href="/" className="flex items-center mx-2 mt-2">
        <Image src="/logo.png" alt="logo" width={50} height={50} />
        <span className="ml-2 text-xl font-bold text-purple-800">
        Story Tailor
        </span>
      </Link>

      {/* nav buttons */}
      <div className="flex flex-wrap gap-3 mr-2 mt-2">
        <Link href="/books" className="hover:text-green-800">
          Books
        </Link>

        <Link href="/dashboard/generate-book" className="hover:text-green-800">
          Generate Book
        </Link>

        <Link href="/search" className="hover:text-green-800">
          Search
        </Link>

        {loggedIn ? (
          <>
            <Link href="/dashboard">
              <span className="relative p-2 capitalize">
                {user?.name}
                <span className="absolute top-0.4 right-0.5 w-2 h-2 bg-green-500 rounded-full"></span>
              </span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:text-green-800">
              Login
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
