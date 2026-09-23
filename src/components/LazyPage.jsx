import React, { Component, lazy, useState } from "react";

export function PageLoading() {
  return <div role="status" aria-live="polite" style={{ minHeight: 240, display: "grid", placeItems: "center", fontFamily: "'Ubuntu', sans-serif", color: "#5C4E3E" }}>Хуудас ачаалж байна…</div>;
}

class PageErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ padding: 40, textAlign: "center" }}>
        <p>Хуудсыг ачаалж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.</p>
        <button onClick={this.props.onRetry}>Дахин оролдох</button>
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
