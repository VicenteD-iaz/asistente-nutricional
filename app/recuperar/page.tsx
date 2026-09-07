"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/actualizar-password`,
    });

    setCargando(false);

    if (error) {
      setError(error.message);
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <main className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-xl font-semibold">Revisa tu correo</h1>
        <p className="mt-2 text-sm text-gray-600">
          Si <strong>{email}</strong> tiene una cuenta, te enviamos un link para elegir una
          contraseña nueva.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold">Olvidé mi contraseña</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Correo
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {cargando ? "Enviando..." : "Enviar link"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        <Link href="/login" className="underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </main>
  );
}
