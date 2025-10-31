import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function Pagination({ page, totalPages }) {
  return (
    <nav className="flex justify-center fixed-bottom opacity-75 mab-10">
      <ul className="flex justify-center items-center space-x-2 mt-5">
        {/* previous button */}
        {page > 1 && (
          <li className="page-item">
            <Link href={`?page=${page - 1}`}>
              <Button variant="outline">
                <ChevronLeft />
              </Button>
            </Link>
          </li>
        )}

        {/* pagination numbers */}
        {Array.from({ length: totalPages }, (_, index) => {
          const p = index + 1;
          return (
            <li key={p} className="page-item">
              <Link href={`?page=${p}`}>
                <Button variant={`${page === p ? "secondary" : "ghost"}`}>
                  {p}
                </Button>
              </Link>
            </li>
          );
        })}

        {/* next button */}
        {page < totalPages && (
          <li className="page-item">
            <Link href={`?page=${page + 1}`}>
              <Button variant="outline">
                <ChevronRight />
              </Button>
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
