import React, { useContext, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon.jsx';
import { DataContext } from '../context/DataContext.jsx';
import './CategoryMenu.css';

export function CategoryMenu({ categories, onSelect }) {
  const [expanded, setExpanded] = useState(null);
  const { products } = useContext(DataContext);
  return <div className="category-menu">{categories.map(category => {
    const subs = [...new Set([...(category.sub || []), ...products.filter(p => p.categoryId === category.id).map(p => p.sub)]
      .map(s => s?.trim()).filter(Boolean))];
    const open = expanded === category.id;
    return <div key={category.id}>
      <button className="category-menu-toggle" aria-expanded={subs.length ? open : undefined}
        onClick={() => subs.length ? setExpanded(open ? null : category.id) : onSelect(category.id, '')}>
        <CategoryIcon icon={category.icon} size={18} /><span>{category.name}</span>
        {!!subs.length && <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />}
      </button>
      <div className={`category-menu-expand${open ? ' is-expanded' : ''}`} inert={open ? undefined : ''} aria-hidden={!open}>
        <div><div className="category-menu-options">
          <button onClick={() => onSelect(category.id, '')}>Бүгд</button>
          {subs.map(sub => <button key={sub} onClick={() => onSelect(category.id, sub)}>{sub}</button>)}
        </div></div>
      </div>
    </div>;
  })}</div>;
}
