export type MatchStrategy = "exact" | "prefix";

export type SearchParamsReader = Pick<URLSearchParams, "get">;

export type NavigationItem = Readonly<{
  id: string;
  label: string;
  href: string;
  match: MatchStrategy;
  activeQuery?: Readonly<Record<string, string>>;
  visibility: "public" | "authenticated";
  showInHeader: boolean;
  showInMobile: boolean;
  showInFooter: boolean;
}>;

export type NavigationAction = Readonly<{
  label: string;
  href: string;
  visibility: "public" | "authenticated";
}>;

export const SITE_ROUTES = {
  home: "/",
  places: "/dia-diem",
  businesses: "/co-so",
  guides: "/cam-nang",
  nearby: "/gan-toi",
  search: "/tim-kiem",
  favorites: "/yeu-thich",
  account: "/tai-khoan",
  faq: "/hoi-dap",
} as const;

export const NAVIGATION_CONFIG = [
  {
    id: "places",
    label: "Khám phá",
    href: SITE_ROUTES.places,
    match: "prefix",
    visibility: "public",
    showInHeader: true,
    showInMobile: true,
    showInFooter: true,
  },
  {
    id: "accommodation",
    label: "Lưu trú",
    href: `${SITE_ROUTES.businesses}?type=homestay`,
    match: "exact",
    activeQuery: { type: "homestay" },
    visibility: "public",
    showInHeader: true,
    showInMobile: true,
    showInFooter: true,
  },
  {
    id: "food",
    label: "Ăn uống",
    href: `${SITE_ROUTES.businesses}?type=nha-hang`,
    match: "exact",
    activeQuery: { type: "nha-hang" },
    visibility: "public",
    showInHeader: true,
    showInMobile: true,
    showInFooter: true,
  },
  {
    id: "guides",
    label: "Cẩm nang",
    href: SITE_ROUTES.guides,
    match: "prefix",
    visibility: "public",
    showInHeader: true,
    showInMobile: true,
    showInFooter: true,
  },
  {
    id: "nearby",
    label: "Gần tôi",
    href: SITE_ROUTES.nearby,
    match: "prefix",
    visibility: "public",
    showInHeader: false,
    showInMobile: true,
    showInFooter: false,
  },
] as const satisfies readonly NavigationItem[];

export const SITE_ACTIONS = {
  search: {
    label: "Tìm kiếm",
    href: SITE_ROUTES.search,
    visibility: "public",
  },
  nearby: {
    label: "Gần tôi",
    href: SITE_ROUTES.nearby,
    visibility: "public",
  },
  favorites: {
    label: "Đã lưu",
    href: SITE_ROUTES.favorites,
    visibility: "authenticated",
  },
  account: {
    label: "Tài khoản",
    href: SITE_ROUTES.account,
    visibility: "authenticated",
  },
} as const satisfies Record<string, NavigationAction>;

export const FOOTER_SUPPORT_LINKS = [
  { label: "Câu hỏi thường gặp", href: SITE_ROUTES.faq },
] as const;

function hrefPathname(href: string): string {
  const queryIndex = href.indexOf("?");
  return queryIndex === -1 ? href : href.slice(0, queryIndex);
}

function pathnameMatches(
  pathname: string,
  targetPathname: string,
  strategy: MatchStrategy,
): boolean {
  if (strategy === "exact") {
    return pathname === targetPathname;
  }

  return (
    pathname === targetPathname || pathname.startsWith(`${targetPathname}/`)
  );
}

export function isNavigationItemActive(
  item: NavigationItem,
  pathname: string,
  searchParams: SearchParamsReader,
): boolean {
  const targetPathname = hrefPathname(item.href);

  if (!pathnameMatches(pathname, targetPathname, item.match)) {
    return false;
  }

  if (!item.activeQuery) {
    return true;
  }

  return Object.entries(item.activeQuery).every(
    ([key, value]) => searchParams.get(key) === value,
  );
}
