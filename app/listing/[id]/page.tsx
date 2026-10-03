import { notFound } from "next/navigation";
import ListingEditor from "@/components/ListingEditor";
import { getListing } from "@/lib/cloudinary.server";

export const dynamic = "force-dynamic";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">Listing studio</p>
      <h1 className="mb-6 mt-1 text-3xl font-extrabold tracking-tight">{listing.title || "Untitled product"}</h1>
      <ListingEditor initial={listing} />
    </div>
  );
}
