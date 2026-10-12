import { inCategory, categorySubs } from "../utils/products.js";
import React, { useContext, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DataContext } from '../context/DataContext.jsx';
import { CategoryMenu } from './CategoryMenu.jsx';

// Navigation only: keep these brands and their products in the catalogue.
const hiddenMenuBrands = new Set(['magister', 'jacks', 'jackscoffee', 'borbone', 'caffeborbone', 'starbucks', 'kalita', 'sweetpage']);
const brandMenuKey = name => (name || '').normalize('NFKD').toLowerCase().replace(/[\s'’‘`ʼ\u0300-\u036f-]/g, '');

export function BrandMenu({ brands, onSelect }) {
  const { categories, products } = useContext(DataContext);
  const [expanded, setExpanded] = useState(null);
  return <div className="category-menu">{brands.filter(brand => !hiddenMenuBrands.has(brandMenuKey(brand.name))).map(brand => {
    const items = products.filter(p => p.brandId === brand.id);
    const brandCategories = categories.filter(c => items.some(p => inCategory(p, c.id)))
      .map(c => ({ ...c, sub: [...new Set(items.filter(p => inCategory(p, c.id)).flatMap(p => categorySubs(p, c.id)).filter(Boolean))] }));
    const open = expanded === brand.id;
    return <div key={brand.id}>
      <button className="category-menu-toggle" aria-expanded={open} onClick={() => setExpanded(open ? null : brand.id)}>
        {brand.logo ? <img src={brand.logo} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} /> : <span aria-hidden="true" />}
        <span>{brand.name}</span><ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <div className={`category-menu-expand${open ? ' is-expanded' : ''}`} inert={open ? undefined : ''} aria-hidden={!open}>
        <div><div className="category-menu-options">
          <button onClick={() => onSelect(brand.id)}>Бүгд</button>
          <CategoryMenu categories={brandCategories} products={items} onSelect={(categoryId, sub) => onSelect(brand.id, categoryId, sub)} />
        </div></div>
      </div>
    </div>;
  })}</div>;
}
