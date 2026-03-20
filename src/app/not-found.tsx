import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-xl font-semibold text-base-content">Page not found</h1>
      <p className="max-w-sm text-sm text-base-content/70">That route does not exist yet.</p>
      <Link
        href="/"
        className="btn btn-primary min-h-11 rounded-xl px-4 text-sm"
      >
        Back home
      </Link>
    </div>
  );
}
