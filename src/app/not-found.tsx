import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mt-16 text-center">
      <h1 className="text-3xl">Not here</h1>
      <p className="mt-3 text-graphite">
        <Link href="/" className="link">
          Back to today&apos;s practice
        </Link>
      </p>
    </div>
  );
}
