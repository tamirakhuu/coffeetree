import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { fetchBootstrap, submitOrder, computeLineTotal, shapeProduct, revertExpiredDiscount, createQpayInvoice } from "./api.js";
import { supabase } from "./supabaseClient.js";
import { T, FONT_IMPORT, primaryBtn } from "./theme.js";
import { slugify, viewFromLocation, pathForView } from "./routing.js";
import { DataContext } from "./context/DataContext.jsx";
import { Toast } from "./components/Toast.jsx";
import { ScrollToTopButton } from "./components/ScrollToTopButton.jsx";
import { Header } from "./components/Header.jsx";
import { availableOptionTypes } from "./utils/products.js";
import { CartDrawer } from "./components/CartDrawer.jsx";
import { Footer } from "./components/Footer.jsx";
import { lazyPage, PageLoading } from "./components/LazyPage.jsx";

const SearchPage = lazyPage(() => import("./pages/SearchPage.jsx"));
const CategoryPage = lazyPage(() => import("./pages/CategoryPage.jsx"));
const BrandPage = lazyPage(() => import("./pages/BrandPage.jsx"));
const ProductDetail = lazyPage(() => import("./pages/ProductDetail.jsx"));
const Home = lazyPage(() => import("./pages/Home.jsx"));
const Checkout = lazyPage(() => import("./pages/Checkout.jsx"));
const QpayPayment = lazyPage(() => import("./pages/QpayPayment.jsx"));
const Confirmation = lazyPage(() => import("./pages/Confirmation.jsx"));
const OrderTrackingPage = lazyPage(() => import("./pages/OrderTrackingPage.jsx"));
const WishlistPage = lazyPage(() => import("./pages/WishlistPage.jsx"));
const TrainingPage = lazyPage(() => import("./pages/TrainingPage.jsx"));
const TrainingStatusPage = lazyPage(() => import("./pages/TrainingStatusPage.jsx"));
const AboutPage = lazyPage(() => import("./pages/AboutPage.jsx"));
const BestsellerPage = lazyPage(() => import("./pages/BestsellerPage.jsx"));
const NewProductsPage = lazyPage(() => import("./pages/NewProductsPage.jsx"));
const DiscountsPage = lazyPage(() => import("./pages/DiscountsPage.jsx"));

export default function App() {
  const [data, setData] = useState({ categories: [], brands: [], products: [] });
  const [dataStatus, setDataStatus] = useState("loading");
  // view нь одоо react-router-ийн location-оос уусгагдана — address bar нь
  // цорын ганц үнэн сурвалж тул хуудас бүр өөрийн гэсэн бодит URL-тэй,
  // хуулж/хуваалцаж, browser-ийн буцах/урагшлах товчоор шилжиж болно
  const location = useLocation();
  const navigate = useNavigate();
  const view = viewFromLocation(location.pathname, location.search);
  const setView = (v) => navigate(pathForView(v, data.brands));
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname, location.search]);
  const [cart, setCart] = useState(() => {
    try { const raw = localStorage.getItem("cuppa:cart:guest"); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  });
  const [wishlist, setWishlist] = useState(() => {
    try { const raw = localStorage.getItem("cuppa:wishlist:guest"); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [qpayInvoice, setQpayInvoice] = useState(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [brandFilter, setBrandFilter] = useState([]);
  const [subFilter, setSubFilter] = useState(null);
  const [sortBy, setSortBy] = useState("default");
  const [toast, setToast] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  // Лого animation
  const MIN_LOADING_MS = 1500;
  const loadData = async () => {
    const startedAt = Date.now();
    try {
      const d = await fetchBootstrap();
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
      setData(d);
      setDataStatus("ready");
    } catch (e) {
      setDataStatus("error");
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const channel = supabase.channel("products-stock")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload) => {
        const updated = shapeProduct(payload.new);
        setData((prev) => ({
          ...prev,
          products: prev.products.map((p) => (p.id === updated.id ? updated : p)),
        }));
      })
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.error("Realtime холболт амжилтгүй боллоо:", status, err);
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Mobile/tab background руу орох үед browser нь setInterval-ыг удаашруулдаг
  // (throttle) тул tab дахин идэвхжих бүрд шууд шалгаж хуучирсан үзүүлэлт
  // үлдэхээс сэргийлнэ
  useEffect(() => {
    const checkExpired = () => {
      setData((prev) => {
        const next = prev.products.map(revertExpiredDiscount);
        return next.some((p, i) => p !== prev.products[i]) ? { ...prev, products: next } : prev;
      });
    };
    const t = setInterval(checkExpired, 5000);
    document.addEventListener("visibilitychange", checkExpired);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", checkExpired);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("cuppa:cart:guest", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem("cuppa:wishlist:guest", JSON.stringify(wishlist));
  }, [wishlist]);
  useEffect(() => {
    setBrandFilter(view.brandId ? [view.brandId] : []);
    setSubFilter(null);
    setSortBy("default");
  }, [view.categoryId, view.brandId]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const addToCart = (product, optionType, qty, note) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id && i.optionType === optionType && (i.note || "") === (note || ""));
      if (existing) return prev.map((i) => i === existing ? { ...i, qty: Math.min(product[optionType].stock || i.qty, i.qty + qty) } : i);
      return [...prev, { productId: product.id, optionType, qty, note: note || undefined }];
    });
    flash(`Сагсанд нэмэгдлээ — ${product.name}`);
  };
  const quickAdd = (product) => addToCart(product, availableOptionTypes(product)[0] || "unit", 1);
  const updateQty = (productId, optionType, note, qty) =>
    setCart((prev) => prev.map((i) => i.productId === productId && i.optionType === optionType && (i.note || "") === (note || "") ? { ...i, qty } : i));
  const removeItem = (productId, optionType, note) =>
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.optionType === optionType && (i.note || "") === (note || ""))));
  const toggleWish = (id) =>
    setWishlist((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const subtotal = useMemo(() => cart.reduce((sum, i) => {
    const p = data.products.find((x) => x.id === i.productId);
    return p ? sum + computeLineTotal(p, i.optionType, i.qty) : sum;
  }, 0), [cart, data.products]);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const openProduct = (p) => setView({ name: "product", productId: p.id });
  // Дэлгэрэнгүй хуудаснаас "Буцах" дарахад аппын дотоод шилжилт байсан бол
  // browser-ийн буцах, эс бол (шууд URL-аар орж ирсэн бол) Нүүр хуудас
  const backFromProduct = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  };
  const handleSearch = (q) => setView({ name: "search", query: q });
  const handleCheckout = () => {
    setCartOpen(false);
    setView({ name: "checkout" });
  };
  const handleConfirm = async (form) => {
    try {
      const { orderNumber, subtotal, deliveryFee } = await submitOrder({ form, cart, products: data.products });
      setOrderNumber(orderNumber);
      // noots hasagdah
      setData((prev) => ({
        ...prev,
        products: prev.products.map((p) => {
          const item = cart.find((i) => i.productId === p.id);
          if (!item) return p;
          const field = item.optionType === "box" ? "box" : "unit";
          return { ...p, [field]: { ...p[field], stock: Math.max(0, (p[field].stock || 0) - item.qty) } };
        }),
      }));
      setCart([]);
      const serverTotal = (subtotal || 0) + (deliveryFee || 0);
      // Захиалга аль хэдийн бүртгэгдсэн тул QPay нэхэмжлэл үүсгэхэд алдаа гарсан ч
      // захиалгыг цуцлахгүй — зүгээр баталгаажуулах хуудас руу шууд оруулна
      // (дараа нь бэлнээр/шилжүүлгээр төлж болно)
      try {
        const invoice = await createQpayInvoice({
          orderNumber, description: `CUPPA захиалга ${orderNumber}`,
        });
        setQpayInvoice(invoice);
        setOrderTotal(serverTotal);
        setView({ name: "payment" });
      } catch (qpayErr) {
        flash("QPay нэхэмжлэл үүсгэхэд алдаа гарлаа, Түр хүлээгээд дахин оролдоно уу: " + qpayErr.message);
        setView({ name: "confirmation" });
      }
    } catch (err) {
      flash("Захиалга үүсгэхэд алдаа гарлаа: " + err.message);
    }
  };
  const handlePaid = () => setView({ name: "confirmation" });

  if (dataStatus === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: T.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <style>{`
          @keyframes cuppa-breathe {
            0%, 100% { transform: scale(0.94); opacity: 0.55; }
            50% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <img src="/cuppa-logo1.png" alt="CUPPA" style={{ height: 170, animation: "cuppa-breathe 3.2s ease-in-out infinite" }} />
      </div>
    );
  }
  if (dataStatus === "error") {
    return (
      <div style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center" }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ maxWidth: 460 }}>
          <ShieldAlert size={30} color={T.cherry} style={{ marginBottom: 12 }} />
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 10 }}>CuppA-тай холбогдож чадсангүй</div>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 14, color: T.inkSoft, lineHeight: 1.6, marginBottom: 16 }}>
            Интернэт холболтоо шалгана уу, эсвэл <code>  CuppA  </code>дэлгүүртэй холбогдож мэдээллэнэ үү Баярлалаа
          </div>
          <button onClick={loadData} style={{ ...primaryBtn, marginTop: 16 }}>Дахин оролдох</button>
        </div>
      </div>
    );
  }

  let body;
  if (view.name === "product") {
    const product = data.products.find((p) => p.id === view.productId);
    body = <ProductDetail product={product} onBack={backFromProduct} onOpen={openProduct} wishlist={wishlist}
      onAddToCart={addToCart} onQuickAdd={quickAdd} isWished={product ? wishlist.includes(product.id) : false} onToggleWish={toggleWish} />;
  } else if (view.name === "home") {
    body = <Home setView={setView} onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} />;
  } else if (view.name === "category") {
    body = <CategoryPage categoryId={view.categoryId} brandFilter={brandFilter} setBrandFilter={setBrandFilter}
      subFilter={subFilter} setSubFilter={setSubFilter} sortBy={sortBy} setSortBy={setSortBy}
      onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "brand") {
    const brand = data.brands.find((b) => slugify(b.name) === view.brandSlug);
    body = <BrandPage brandId={brand?.id} onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "search") {
    body = <SearchPage query={view.query} products={data.products} openProduct={openProduct} quickAdd={quickAdd} wishlist={wishlist} toggleWish={toggleWish} />;
  } else if (view.name === "wishlist") {
    body = <WishlistPage wishlist={wishlist} onOpen={openProduct} onQuickAdd={quickAdd} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "checkout") {
    body = <Checkout cart={cart} subtotal={subtotal} onConfirm={handleConfirm} onBack={() => setView({ name: "home" })} />;
  } else if (view.name === "payment") {
    body = <QpayPayment orderNumber={orderNumber} subtotal={orderTotal} invoice={qpayInvoice} onPaid={handlePaid} />;
  } else if (view.name === "confirmation") {
    body = <Confirmation orderNumber={orderNumber} onContinue={() => setView({ name: "home" })} onTrack={() => setView({ name: "order-status" })} />;
  } else if (view.name === "training") {
    body = <TrainingPage setView={setView} />;
  } else if (view.name === "training-status") {
    body = <TrainingStatusPage setView={setView} />;
  } else if (view.name === "about") {
    body = <AboutPage />;
  } else if (view.name === "bestseller") {
    body = <BestsellerPage onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "new") {
    body = <NewProductsPage onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "discounts") {
    body = <DiscountsPage onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "order-status") {
    body = <OrderTrackingPage setView={setView} />;
  }

  return (
    <DataContext.Provider value={data}>
      <div style={{ background: T.paper, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Ubuntu', sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <Header setView={setView} cartCount={cartCount} wishCount={wishlist.length}
          onOpenCart={() => setCartOpen(true)} onSearch={handleSearch} />
        <main style={{ flex: 1 }}><Suspense fallback={<PageLoading />}>{body}</Suspense></main>
        <Footer setView={setView} transparent={view.name === "training"} />
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} updateQty={updateQty} removeItem={removeItem} subtotal={subtotal} onCheckout={handleCheckout} onQuickAdd={quickAdd} />
        <Toast message={toast} />
        <ScrollToTopButton />
      </div>
    </DataContext.Provider>
  );
}
