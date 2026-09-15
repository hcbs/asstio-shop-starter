import Link from "next/link";
import { draftMode } from "next/headers";

export const metadata = {
  title: "Asstio shop starter",
  description: "Reference storefront on the Asstio Storefront API.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: draft } = await draftMode();
  return (
    <html lang={process.env.STOREFRONT_LANGUAGE ?? "sv"}>
      <body>
        {draft && (
          <p>
            Förhandsvisning (opublicerat innehåll). <Link href="/api/draft/disable">Avsluta</Link>
          </p>
        )}
        <header>
          <Link href="/">Start</Link>
        </header>
        {children}
      </body>
    </html>
  );
}
