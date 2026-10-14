import { ChevronLeft } from "lucide-react";
import { backBtnStyle } from "../theme.js";
import React from "react";
import { useNavigate } from "react-router-dom";

export function BackButton({ onClick, style }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else if (onClick) onClick();
    else navigate('/');
  };
  return <button onClick={goBack} style={{ ...backBtnStyle, ...style }}><ChevronLeft size={15} /> Буцах</button>;
}
