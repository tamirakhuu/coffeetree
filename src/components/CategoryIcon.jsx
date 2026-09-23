import { CoffeeBeanIcon, TeaLeafIcon, SyrupIcon, SauceIcon, PowderIcon, SmoothieIcon, TamperIcon, PaperCupIcon } from "../categoryIcons.jsx";
import React from "react";

export const ICONS = {
  CoffeeBean: CoffeeBeanIcon,
  TeaLeaf: TeaLeafIcon,
  Syrup: SyrupIcon,
  Sauce: SauceIcon,
  Powder: PowderIcon,
  Smoothie: SmoothieIcon,
  Wrench: TamperIcon,
  PaperCup: PaperCupIcon,
};

export const ICON_KEYS = Object.keys(ICONS);

export function CategoryIcon({ icon, size = 20, color }) {
  if (icon && /^https?:\/\//.test(icon)) {
    return (
      <span
        role="img"
        style={{
          display: "inline-block", width: size, height: size, flexShrink: 0,
          backgroundColor: color || "currentColor",
          WebkitMaskImage: `url(${icon})`, maskImage: `url(${icon})`,
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
          WebkitMaskPosition: "center", maskPosition: "center",
          WebkitMaskSize: "contain", maskSize: "contain",
        }}
      />
    );
  }
  const Icon = ICONS[icon] || CoffeeBeanIcon;
  return <Icon size={size} color={color} />;
}
