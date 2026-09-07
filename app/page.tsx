import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-semibold">Asistente Nutricional</h1>
      <p className="max-w-md text-gray-600">
        Planifica tus comidas según lo que ya tienes en casa y tu presupuesto.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded border border-gray-300 px-5 py-2 text-sm font-medium"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="rounded bg-black px-5 py-2 text-sm font-medium text-white"
        >
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
