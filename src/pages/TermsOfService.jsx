import { Link } from "react-router-dom";
import { LegalLayout, legal } from "./LegalLayout.jsx";

export default function TermsOfService() {
  return (
    <LegalLayout>
      <h1 style={legal.h1}>Үйлчилгээний нөхцөл</h1>
      <div style={legal.sub}>Сүүлд шинэчилсэн: 2026 оны 8-р сар</div>

      <p style={legal.p}>
        CUPPA вебсайтыг (cuppamn.vercel.app) ашигласнаар та дараах нөхцлүүдийг
        зөвшөөрч байгаа болно.
      </p>

      <h2 style={legal.h2}>1. Үйлчилгээний тухай</h2>
      <p style={legal.p}>
        CUPPA нь кофе, цай болон холбогдох бүтээгдэхүүнийг ширхэг болон хайрцгаар
        онлайнаар захиалах боломж олгодог платформ юм.
      </p>

      <h2 style={legal.h2}>2. Бүртгэл</h2>
      <p style={legal.p}>
        Захиалга өгөхийн тулд та бүртгэл үүсгэх (имэйл, Facebook, Google эсвэл
        Magic Link-ээр) шаардлагатай. Та өгсөн мэдээллийнхээ үнэн зөвийг хариуцна.
      </p>

      <h2 style={legal.h2}>3. Захиалга ба төлбөр</h2>
      <ul style={legal.ul}>
        <li style={legal.li}>Захиалга баталгаажсаны дараа бид уг захиалгыг боловсруулна</li>
        <li style={legal.li}>Барааны үнэ, нөөц тухайн үед харагдаж буй мэдээлэлд үндэслэнэ</li>
        <li style={legal.li}>Төлбөрийг QPay эсвэл хүргэлтийн үед бэлнээр хийж болно</li>
      </ul>

      <h2 style={legal.h2}>4. Хүргэлт</h2>
      <p style={legal.p}>
        Хүргэлтийн хугацаа, нөхцөл захиалгын үед мэдэгдэнэ. Хаягийн буруу
        мэдээллээс үүдэх хүргэлтийн саатлыг бид хариуцахгүй.
      </p>

      <h2 style={legal.h2}>5. Цуцлалт ба буцаалт</h2>
      <p style={legal.p}>
        Захиалга хүргэгдэхээс өмнө цуцлах хүсэлтийг бидэнтэй холбогдож гаргаж
        болно.
      </p>

      <h2 style={legal.h2}>6. Хариуцлагын хязгаарлалт</h2>
      <p style={legal.p}>
        Бид үйлчилгээгээ тасралтгүй, алдаагүй байлгахыг хичээх боловч техникийн
        саатал гарч болзошгүйг анхаарна уу.
      </p>

      <h2 style={legal.h2}>7. Холбоо барих</h2>
      <div style={legal.box}>
        <div style={legal.boxLabel}>Имэйл</div>
        <div style={legal.boxEmail}>cuppabrandmanager@gmail.com</div>
      </div>

      <div style={legal.links}>
        <Link to="/privacy" style={legal.link}>Нууцлалын бодлого</Link>
      </div>
    </LegalLayout>
  );
}
