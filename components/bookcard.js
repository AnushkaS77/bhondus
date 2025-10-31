import React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export default function BookCard({ book }) {
  return (
    <Card className="w-full max-w-2xl transform transition duration-300 hover:scale-100 hover:shadow-lg">
      <CardHeader className="flex flex-col pb-2">
        <div className="w-full aspect-[3/2] relative overflow-hidden rounded-md">
          {book?.bookCoverUrl && (
            <Image
              src={book?.bookCoverUrl}
              alt={book?.bookTitle}
              layout="fill"
              objectFit="cover"
              className="w-full h-full"
            />
          )}
        </div>

        <CardTitle className="text-lg line-clamp-1 mt-2">
          {book?.bookTitle}
        </CardTitle>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <p className="line-clamp-1">by {book?.author.name}</p>
          <p>{dayjs(book.createdAt).fromNow()}</p>
        </div>
      </CardHeader>
    </Card>
  );
}
