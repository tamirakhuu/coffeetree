const order = [
  'Кофе', 'Сироп', 'Соус', 'Нунтаг', 'Smoothie / Base', 'Ade / Pulp',
  'Цай/Цайны хэрэгсэл', 'Цэцэг, Жимс', 'Бариста хэрэгсэл',
  'Кофе шопын хэрэгсэл', 'Кофены хэрэгсэл', 'Нэг удаагийн хэрэгсэл',
];
const key = name => (name || '').toLowerCase().replace(/[\s,/]+/g, '');
const ranks = new Map(order.map((name, index) => [key(name), index]));

export const sortHomeCategories = categories => [...categories].sort((a, b) =>
  (ranks.get(key(a.name)) ?? order.length) - (ranks.get(key(b.name)) ?? order.length));
