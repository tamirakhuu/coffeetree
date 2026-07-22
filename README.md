# CUPPA — Roastery Supply (Supabase-тэй, admin panel тусдаа)

Энэ төсөл одоо **Supabase** (cloud дээрх Postgres database + Auth)-тай ажилладаг. Local Node
сервер огт хэрэггүй болсон — store болон admin panel хоёулаа ижил Supabase төслөөс шууд browser-с
холбогддог.

## Ерөнхий бүтэц

```
cuppa-store/
├── index.html, vite.config.js, package.json   — Дэлгүүрийн frontend (React + Vite), port 5173
├── src/
│   ├── App.jsx              — Дэлгүүрийн бүх UI (ангилал, сагс, захиалга)
│   ├── api.js                — Supabase-аас унших / захиалга бичих функцууд
│   ├── supabaseClient.js     — Supabase холболтын тохиргоо (URL + anon key)
│   └── main.jsx
├── admin-panel.html          — Тусдаа admin panel (build шаардахгүй, шууд browser-т нээнэ)
└── supabase-schema.sql       — Supabase дээр нэг удаа ажиллуулах SQL script
```

## Тохируулах дараалал (эхлээд НЭГ л удаа)

### 1) Supabase-д хүснэгт үүсгэх
1. https://supabase.com/dashboard → таны төсөл (`vbgqgwfcklkfecvocsyt`) руу орно
2. Зүүн талын цэснээс **SQL Editor** → **New query**
3. `supabase-schema.sql` файлын бүх агуулгыг хуулж тавиад **Run** дарна
4. Амжилттай бол `categories`, `subcategories`, `brands`, `products`, `orders`, `order_items`
   гэсэн 6 хүснэгт үүсэж, 17 бараа автоматаар орсон байх ёстой (**Table Editor**-оос харж болно)

> ⚠️ Энэ script нь эхлээд хуучин `products` хүснэгтийг устгадаг тул хэрэв тэнд бодит
> (сэргээх шаардлагатай) өгөгдөл байвал script-ийн эхний "drop table" мөрүүдийг comment хийнэ үү.

### 2) Admin эрхтэй хэрэглэгч үүсгэх
1. Supabase Dashboard → **Authentication** → **Users** → **Add user** → **Create new user**
2. Имэйл, нууц үг оруулаад үүсгэнэ (жишээ: `admin@cuppa.mn` / өөрийн нууц үг)
3. Энэ имэйл/нууц үгээр `admin-panel.html`-руу нэвтэрнэ

## Ажиллуулах

### Дэлгүүр (customer-facing store)
```bash
npm install
npm run dev
```
`http://localhost:5173` нээгдэнэ. **Backend сервер шаардахгүй** — шууд Supabase-тай холбогдоно.

### Admin panel
`admin-panel.html` файл дээр давхар товшиж browser-т шууд нээнэ (эсвэл VS Code-ийн "Live Server"
өргөтгөлөөр нээж болно). Build хийх шаардлагагүй, Node.js ч хэрэггүй.

Нэвтэрсний дараа:
- **Бараа** — нэмэх/засах/устгах (брэнд, ангилал, дэд ангилал, ширхэг/хайрцгийн үнэ-нөөц,
  **дор хаяж 1, дээд тал нь 3 зураг** upload хийх)
- **Ангилал** — шинэ ангилал + дэд ангилал нэмэх, устгах
- **Брэнд** — нэмэх, устгах
- **Захиалга** — дэлгүүр дээрээс ирсэн захиалгуудыг харах, төлөв (хүлээгдэж байна →
  боловсруулж байна → явуулсан → хүргэгдсэн) солих

Admin panel-д upload хийсэн зураг **дэлгүүр дээр шууд харагдана** (barааны карт, дэлгэрэнгүй
хуудсан дээр, олон зурагтай бол thumbnail-аар сонгож үзэх боломжтой) — учир нь store-ийн код
`images` баганыг Supabase-аас уншиж, байхгүй бол хуучин градиент-loo дизайн руу автоматаар
буцдаг.

## Хэрхэн хамтдаа ажилладаг вэ

```
Хэрэглэгч (store)  →  Supabase (public read)      →  Бараа харагдана
Хэрэглэгч (store)  →  Supabase (public insert)     →  Захиалга үүснэ
Admin (нэвтэрсэн)  →  Supabase (authenticated CRUD) →  Бараа нэмэх/засах/устгах,
                                                          захиалгын төлөв солих
```

Admin panel дээр нэмсэн бараа **шууд** дэлгүүрт харагдана (дэлгүүрийг дахин ачаалахад) — учир нь
хоёул ижил database-аас уншдаг. Тусдаа сервер, тусдаа файл хооронд синхрончлох шаардлагагүй.

## Аюулгүй байдлын тухай

- `anon key` нь клиент код дотор ил байдаг ч энэ нь **зориулалтын дагуу**: Row Level Security
  (RLS) policy-ууд нь уншихыг (SELECT) бүгдэд, харин нэмэх/засах/устгахыг зөвхөн нэвтэрсэн
  (`authenticated`) хэрэглэгчид (admin) зөвшөөрдөг.
- Захиалга (`orders`, `order_items`) INSERT хийхийг нэвтрээгүй хэрэглэгчид ч зөвшөөрсөн (учир нь
  дэлгүүрийн үзэгч нэвтрэлгүйгээр захиалга өгөх ёстой), гэхдээ жагсаалтыг зөвхөн admin уншина.
- Хэрэв та энэ төслийг олон нийтэд нээлттэй болгох бол admin-panel.html-г тусдаа, олон нийтэд
  зарлагдаагүй URL дээр байршуулахыг зөвлөж байна (жишээ нь `/admin-xyz123.html` мэт), учир нь
  файл нь anon key агуулдаг тул хэн ч login хуудсыг олж болно — гэхдээ нууц үггүйгээр орж
  чадахгүй тул RLS хамгаалалт тул үндсэн аюулгүй байдал хадгалагдана.

## Хэрэглэгчийн нэвтрэлт/бүртгэл (дэлгүүрийн үзэгчид зориулсан)

Одоо энэ бол **демо биш, жинхэнэ Supabase Auth** — admin-ий нэвтрэлттэй ижил системийг ашигладаг
(гэхдээ admin биш энгийн хэрэглэгчийн эрхээр).

### Имэйл/нууц үгээр (нэмэлт тохиргоогүйгээр шууд ажиллана)
- **Бүртгүүлэх** → `supabase.auth.signUp(...)` — шинэ хэрэглэгч Supabase-ийн `auth.users`
  хүснэгтэд бодитоор үүснэ (Dashboard → Authentication → Users-с харагдана)
- **Нэвтрэх** → `supabase.auth.signInWithPassword(...)`
- Session нь browser дээр автоматаар хадгалагдаж, дахин ороход дахин нэвтрэх шаардлагагүй

> ⚠️ **Анхаарах зүйл:** Supabase-ийн анхны тохиргоогоор бүртгүүлсний дараа **имэйл баталгаажуулах
> шаардлагатай** (project-ийн "Confirm email" тохиргоо идэвхтэй бол). Тестлэхэд хялбар байлгахын
> тулд: Supabase Dashboard → **Authentication → Providers → Email** → **"Confirm email"**-г unchecked
> (idэвхгүй) болгож болно — ингэснээр бүртгүүлмэгц шууд нэвтэрнэ.

### Google / Facebook-оор нэвтрэх (нэмэлт тохиргоо шаардлагатай)

Эдгээр товч дарахад одоо жинхэнэ OAuth redirect хийгддэг болсон, гэхдээ ажиллахын тулд эхлээд
Supabase дээр provider тохируулах шаардлагатай:

**Google:**
1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials →
   **Create OAuth client ID** (Web application)
2. **Authorized redirect URIs**-д Supabase-ийн өгсөн callback URL-г нэмнэ:
   `https://vbgqgwfcklkfecvocsyt.supabase.co/auth/v1/callback`
3. Client ID, Client Secret-г хуулж авна
4. Supabase Dashboard → **Authentication → Providers → Google** → идэвхжүүлээд Client ID/Secret-г
   тавьж хадгална

**Facebook:**
1. [Facebook for Developers](https://developers.facebook.com/) → My Apps → Create App
2. Facebook Login бүтээгдэхүүн нэмээд, **Valid OAuth Redirect URI**-д мөн адил Supabase callback
   URL-г тавина
3. App ID, App Secret-г Supabase Dashboard → **Authentication → Providers → Facebook**-т тавьж
   хадгална

Эдгээрийг тохируулаагүй үед Google/Facebook товч дарахад Supabase-аас алдааны мессеж буцаж ирнэ
(жишээ нь "provider is not enabled") — энэ бол код алдаа биш, зөвхөн Dashboard дээрх тохиргоо
дутуу байгааг илэрхийлж байна.

### Захиалгатай холбох (сонголт)
Одоогоор захиалга нэвтэрсэн/нэвтрээгүй хэрэглэгч хоёуланд адилхан ажилладаг (guest checkout).
Хэрэв нэвтэрсэн хэрэглэгчийн имэйлийг захиалгатай холбож, "миний захиалгууд" хуудас хийх бол
надад хэлээрэй — нэмж хийж өгье.


## Build хийж deploy хийх

Дэлгүүр:
```bash
npm run build
```
`dist/` хавтсыг Vercel/Netlify-д байршуулж болно — Supabase аль хэдийн cloud дээр байгаа тул
нэмэлт backend deploy хийх шаардлагагүй.

`admin-panel.html`-г мөн адил статик байдлаар хаана ч (Vercel, Netlify, эсвэл зүгээр нэг файл
болгон) байршуулж болно.
#   c o f f e e t r e e  
 