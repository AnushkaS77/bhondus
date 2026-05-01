import BookView from "@/components/bookview";
import { getBookDb } from "@/actions/book";

export default async function MyBook({ params }) {
  // Unwrap dynamic route params (Next.js 16 may provide a Promise-like object here)
  const resolvedParams = await params;
  const { slug } = resolvedParams;
  const data = await getBookDb(slug);
  return (
    <div>
      <BookView data={data} />
      {/* <pre>
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre> */}
    </div>
  );
}
