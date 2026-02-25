import Link from "next/link";

const routes = [
  {
    href: "/suratJalan",
    title: "Surat Jalan",
    description:
      "Halaman Surat Jalan dengan tabel, filter field, serta form dan preview dalam satu halaman.",
    cta: "Buka Surat Jalan",
  },
  {
    href: "/surat-jalan",
    title: "Aplikasi Surat Jalan (API Backend)",
    description: "Tabel Surat Jalan dari backend dengan fitur filter berdasarkan field.",
    cta: "Buka Aplikasi",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Prima Putra Perkasa
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Frontend Surat Jalan</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Pilih halaman yang ingin digunakan: sample style UI atau halaman aplikasi dengan data Surat Jalan dari backend.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-slate-900">{route.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{route.description}</p>
            <p className="mt-4 text-sm font-medium text-slate-800">{route.cta}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
