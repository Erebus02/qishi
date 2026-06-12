import { FALLBACK_FISHING_SPOTS } from "@/lib/geo/fishing-spots";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const spot = FALLBACK_FISHING_SPOTS.find((item) => item.id === id);

  if (!spot) {
    return Response.json({ message: "Spot not found" }, { status: 404 });
  }

  return Response.json(spot);
}
