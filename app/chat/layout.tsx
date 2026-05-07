import { RequireApiKey } from "@/components/providers/RequireApiKey";

/** Avoid brittle static optimization for hub route that redirects to `/chat/[id]`. */
export const dynamic = "force-dynamic";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireApiKey>{children}</RequireApiKey>;
}
