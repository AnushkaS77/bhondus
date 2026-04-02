"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Loader2Icon } from "lucide-react";
import { searchBooksDb } from "@/actions/book";
import Link from "next/link";
import Image from "next/image";

// Component wrapped in Suspense
function SearchComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [text, setText] = useState(searchParams.get("query") || "");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Synchronize URL query parameters with state
  useEffect(() => {
    const query = searchParams.get("query") || "";
    searchBooksDb(query).then((result) => setBooks(result));
  }, [searchParams]);

  // Function to fetch blogs
  const handleSearch = async (e) => {
    e.preventDefault();
    router.push(`?query=${text}`);

    setLoading(true);
    try {
      const result = await searchBooksDb(text);
      setBooks(result);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form className="flex gap-4 items-stretch" onSubmit={handleSearch}>
        <Input
          id="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search blogs"
          className="flex-1"
          autoFocus
        />
        <Button
          type="submit"
          variant="outline"
          disabled={loading}
          className="flex items-center justify-center"
        >
          {loading ? (
            <Loader2Icon className="animate-spin w-5 h-5" />
          ) : (
            <SearchIcon className="w-5 h-5" />
          )}
          <span className="ml-2">Search</span>
        </Button>
      </form>

      <div className="mt-8">
        {loading ? (
          <p>Loading...</p>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((book) => (
              <Link key={book._id} href={`/book/${book.slug}`} className="group">
                <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                    {book?.bookCoverUrl ? (
                      <Image
                        src={book.bookCoverUrl}
                        alt={book.bookTitle}
                        fill
                        unoptimized
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-100 via-pink-100 to-yellow-100 px-4 text-center text-sm font-medium text-gray-500">
                        No cover yet
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
                      <h2 className="line-clamp-2 text-sm font-semibold text-white sm:text-base">
                        {book.bookTitle}
                      </h2>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">
            Your search starts here. Type something to search...
          </p>
        )}
      </div>
    </div>
  );
}

// Parent Component with Suspense
export default function SearchPage() {
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <Label htmlFor="search" className="block text-lg font-semibold">
        Search
      </Label>

      <Suspense fallback={<p>Loading search parameters...</p>}>
        <SearchComponent />
      </Suspense>
    </div>
  );
}
