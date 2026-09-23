

export function slugify(str) {
  return (str || "").toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function viewFromLocation(pathname, search) {
  const params = new URLSearchParams(search);
  let m;
  if ((m = pathname.match(/^\/category\/(\d+)\/?$/))) return { name: "category", categoryId: Number(m[1]) };
  if ((m = pathname.match(/^\/brand\/([^/]+)\/?$/))) return { name: "brand", brandSlug: m[1] };
  if ((m = pathname.match(/^\/product\/(\d+)\/?$/))) return { name: "product", productId: Number(m[1]) };
  if (pathname === "/bestseller") return { name: "bestseller" };
  if (pathname === "/new") return { name: "new" };
  if (pathname === "/training") return { name: "training" };
  if (pathname === "/discount") return { name: "discounts" };
  if (pathname === "/order-status") return { name: "order-status" };
  if (pathname === "/training-status") return { name: "training-status" };
  if (pathname === "/checkout") return { name: "checkout" };
  if (pathname === "/wishlist") return { name: "wishlist" };
  if (pathname === "/about") return { name: "about" };
  if (pathname === "/search") return { name: "search", query: params.get("q") || "" };
  if (pathname === "/payment") return { name: "payment" };
  if (pathname === "/confirmation") return { name: "confirmation" };
  return { name: "home" };
}

export function pathForView(view, brands = []) {
  switch (view?.name) {
    case "category": return `/category/${view.categoryId}`;
    case "brand": {
      const brand = brands.find((b) => b.id === view.brandId);
      return `/brand/${slugify(brand?.name || "")}`;
    }
    case "product": return `/product/${view.productId}`;
    case "bestseller": return "/bestseller";
    case "new": return "/new";
    case "training": return "/training";
    case "discounts": return "/discount";
    case "order-status": return "/order-status";
    case "training-status": return "/training-status";
    case "checkout": return "/checkout";
    case "wishlist": return "/wishlist";
    case "about": return "/about";
    case "search": return view.query ? `/search?q=${encodeURIComponent(view.query)}` : "/search";
    case "payment": return "/payment";
    case "confirmation": return "/confirmation";
    default: return "/";
  }
}
