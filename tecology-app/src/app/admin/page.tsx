import type { Metadata } from "next";
import AdminApp from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: "Tecology · Panel administrativo",
};

export default function AdminPage() {
  return <AdminApp />;
}
