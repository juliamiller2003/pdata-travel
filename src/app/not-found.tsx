import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-[#9fb8b8]">404</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-[#efefef]">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-[#9fb8b8]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/trips"
        className="btn-primary mt-8"
      >
        Back to my trips
      </Link>
    </div>
  );
}
