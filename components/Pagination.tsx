import Link from "next/link";
import { withParam, type SearchParams } from "@/lib/urls";

/** Previous/next over `total` and `pageSize`. The API reports both as strings, hence the Number() calls. */
export function Pagination({
  pathname,
  searchParams,
  page,
  pageSize,
  total,
}: {
  pathname: string;
  searchParams: SearchParams;
  page: number | string;
  pageSize: number | string;
  total: number | string;
}) {
  const current = Number(page);
  const pages = Math.max(1, Math.ceil(Number(total) / Math.max(1, Number(pageSize))));
  if (pages <= 1) return null;
  return (
    <nav>
      {current > 1 && (
        <Link href={withParam(pathname, searchParams, "page", String(current - 1))} rel="prev">
          Föregående
        </Link>
      )}{" "}
      <span>
        Sida {current} av {pages}
      </span>{" "}
      {current < pages && (
        <Link href={withParam(pathname, searchParams, "page", String(current + 1))} rel="next">
          Nästa
        </Link>
      )}
    </nav>
  );
}
