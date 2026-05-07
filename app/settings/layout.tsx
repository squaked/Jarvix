import { RequireApiKey } from "@/components/providers/RequireApiKey";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireApiKey>{children}</RequireApiKey>;
}
