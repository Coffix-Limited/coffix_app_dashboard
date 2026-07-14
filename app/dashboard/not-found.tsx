import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold text-black">Page not found</h1>
      <p className="max-w-sm text-sm text-gray-500">
        This page doesn&apos;t exist or you don&apos;t have permission to view it.
      </p>
      <Link
        href="/dashboard/products"
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm text-white transition-colors hover:opacity-90"
      >
        Back to Products
      </Link>
    </div>
  );
}
