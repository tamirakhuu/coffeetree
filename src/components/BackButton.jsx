import { ChevronLeft } from "lucide-react";
import { backBtnStyle } from "../theme.js";
import React from "react";

export function BackButton({ onClick, style }) {
  return <button onClick={onClick} style={{ ...backBtnStyle, ...style }}><ChevronLeft size={15} /> Буцах</button>;
}
