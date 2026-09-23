import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import { lazyPage, PageLoading } from "./components/LazyPage.jsx";
import "./responsive.css";

const PrivacyPolicy = lazyPage(() => import("./pages/PrivacyPolicy.jsx"));
const TermsOfService = lazyPage(() => import("./pages/TermsOfService.jsx"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<App />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
