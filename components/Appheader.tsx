import Link from "next/link";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
};

export default function AppHeader({
  title,
  subtitle,
  backHref = "/",
}: AppHeaderProps) {
  return (
    <header>
      <Link href={backHref} className="text-3xl font-black">
        ←
      </Link>

      <div className="mt-6">
        <h1 className="text-3xl font-black text-accent">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
    </header>
  );
}