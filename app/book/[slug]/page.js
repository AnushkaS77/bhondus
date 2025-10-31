import BookView from "@/components/bookview";
import { getBookDb } from "@/actions/book";

export default async function MyBook({ params }) {
  const slug = await params.slug;
  const data = await getBookDb(slug);
  return (
    <>
      <BookView data={data} />
      {/* <pre>
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre> */}
    </>
  );
}
