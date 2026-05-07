import { RequireApiKey } from "@/components/providers/RequireApiKey";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function Home() {
  return (
    <RequireApiKey>
      <Dashboard />
    </RequireApiKey>
  );
}
