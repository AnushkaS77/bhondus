"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { deleteBookDb } from "@/actions/book";

export default function BookcardOverlayButtons({ book }) {
  const router = useRouter();

  const handleDelete = async (e) => {
    e.preventDefault();
    const isConfirm = confirm("Are you sure you want to delete this book?");
    if (!isConfirm) return;

    await deleteBookDb(book._id);
    router.refresh();
  };

  return (
    <div
      className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
      onClick={(e) => e.stopPropagation()} // prevent parent Link click
    >
      <div className="flex space-x-4">
        {/* FIX: Use router.push instead of <Link> */}
        <Button
          onClick={(e) => {
            e.preventDefault();
            router.push(`/book/${book.slug}`);
          }}
          className="bg-blue-800 text-white hover:bg-blue-500"
        >
          View
        </Button>

        <Button
          onClick={handleDelete}
          className="bg-red-500 text-white hover:bg-red-700"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
