"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Loader2Icon } from "lucide-react";
import { searchBooksDb } from "@/actions/book";
import Link from "next/link";

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

      <div className="mt-5">
        {loading ? (
          <p>Loading...</p>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <Link key={book._id} href={`/book/${book.slug}`}>
                <div className="border p-4 rounded-lg shadow-sm hover:shadow-md">
                  <h2 className="text-lg font-semibold">{book.bookTitle}</h2>
                </div>
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
