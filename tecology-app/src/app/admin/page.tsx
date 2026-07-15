import type { Metadata } from "next";
import AdminGate from "@/components/admin/AdminGate";

export const metadata: Metadata = {
  title: "Tecology · Panel administrativo",
};

export default function AdminPage() {
  return <AdminGate />;
}
