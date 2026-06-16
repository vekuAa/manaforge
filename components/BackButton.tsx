import Link from "next/link";

export default function BackButton() {
  return (
    <Link
      href="/"
      className="text-violet-400 hover:text-violet-300 transition"
    >
      ← Retour
    </Link>
  );
}