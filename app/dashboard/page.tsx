import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CerrarSesionButton from "./cerrar-sesion-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold">Bienvenido</h1>
      <p className="mt-2 text-sm text-gray-600">Sesión iniciada como {user.email}</p>
      <div className="mt-6">
        <CerrarSesionButton />
      </div>
    </main>
  );
}
