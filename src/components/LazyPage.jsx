import React, { Component, lazy, useState } from "react";
import "./LazyPage.css";

export function PageLoading() {
  return <div className="page-loading" role="status" aria-live="polite"><span className="page-loading-spinner" aria-hidden="true" /><span>Түр хүлээнэ үү</span></div>;
}

class PageErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error("Page render/load failed:", error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const assetLoadFailed = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|Unable to preload CSS/i.test(this.state.error.message || "");
    return (
      <div role="alert" style={{ padding: 40, textAlign: "center" }}>
        <p>Хуудсыг ачаалж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.</p>
        <button onClick={assetLoadFailed ? () => window.location.reload() : this.props.onRetry}>Дахин оролдох</button>
      </div>
    );
  }
}

// Retry only the failed page import; keep cart and payment state in App intact.
export function lazyPage(load) {
  const InitialPage = lazy(load);
  return function LazyPage(props) {
    const [{ Page, attempt }, setPage] = useState(() => ({ Page: InitialPage, attempt: 0 }));
    return (
      <PageErrorBoundary key={attempt} onRetry={() => setPage(({ attempt }) => ({ Page: lazy(load), attempt: attempt + 1 }))}>
        <Page {...props} />
      </PageErrorBoundary>
    );
  };
}
