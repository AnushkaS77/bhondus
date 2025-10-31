import React from "react";
import { getUserBooksDb } from "@/actions/book";
import Link from "next/link";
import BookCard from "@/components/bookcard";
import Pagination from "@/components/pagination";
import OverlayButtons from "@/components/bookcard-overlay-buttons";

export default async function DashboardPage({ searchParams }) {
  const { page } = await searchParams;
  const currentPage = page ? parseInt(page, 10) : 1;
  const limit = 3;

  const { books, totalCount } = await getUserBooksDb(currentPage, limit);
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="md:mt-0">
      <div className="pt-5">
        <h1 className="text-2xl font-bold">My Library</h1>
        <p className="text-sm text-gray-500">
          Total books: {totalPages * limit}
        </p>

        <br />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((book) => (
            <div key={book._id} className="relative group">
              <Link href={`/book/${book.slug}`}>
                <BookCard book={book} />
                {/* overlay */}
                <OverlayButtons book={book} />
              </Link>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-5">
          <Pagination totalPages={totalPages} page={currentPage} />
        </div>
      </div>
    </div>
  );
}
