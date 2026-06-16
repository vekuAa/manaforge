import Image from "next/image";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

type ScryfallCard = {
  name: string;
  mana_cost?: string;
  oracle_text?: string;
  printed_text?: string;
  printed_name?: string;
  scryfall_uri: string;
  image_uris?: {
    normal?: string;
  };
  card_faces?: {
    oracle_text?: string;
    printed_text?: string;
    image_uris?: {
      normal?: string;
    };
  }[];
};

async function getRandomCommander(): Promise<ScryfallCard> {
  const res = await fetch(
    "https://api.scryfall.com/cards/random?q=type%3Alegendary%20type%3Acreature%20legal%3Acommander%20lang%3Afr",
    {
      cache: "no-store",
      headers: {
        "User-Agent": "ManaForge/1.0",
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Erreur Scryfall :", errorText);
    throw new Error("Impossible de récupérer un commandant.");
  }

  return res.json();
}

export default async function CommanderPage() {
  const card = await getRandomCommander();

  const image =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal;

  const name = card.printed_name || card.name;

  const text =
    card.printed_text ||
    card.oracle_text ||
    card.card_faces?.[0]?.printed_text ||
    card.card_faces?.[0]?.oracle_text ||
    "Aucun texte disponible.";

  return (
    <main className="page">
      <section className="container-app">
        <header>
          <Link href="/" className="text-3xl font-black">
            ←
          </Link>

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-muted">
              Commander / EDH
            </p>

            <h1 className="mt-2 text-4xl font-black text-accent">
              Random Commander
            </h1>

            <p className="mt-2 text-muted">
              Génère une idée de deck aléatoire.
            </p>
          </div>
        </header>

        <div className="mt-8 card-premium overflow-hidden p-5">
          {image && (
            <Image
              src={image}
              alt={name}
              width={360}
              height={500}
              className="mx-auto rounded-3xl shadow-2xl"
              priority
            />
          )}

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted">
              Commandant généré
            </p>

            <h2 className="mt-2 text-3xl font-black text-accent">
              {name}
            </h2>

            {card.mana_cost && (
              <p className="mt-2 text-xl font-bold text-white">
                {card.mana_cost}
              </p>
            )}

            <p className="mt-5 whitespace-pre-line text-sm leading-6 text-slate-300">
              {text}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/commander"
            className="btn-primary text-center"
          >
            🎲 Nouveau
          </Link>

          <a
            href={card.scryfall_uri}
            target="_blank"
            rel="noreferrer"
            className="btn-soft text-center"
          >
            Scryfall ↗
          </a>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}