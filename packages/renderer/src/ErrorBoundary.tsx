'use client';

// React error boundaries must be class components, and class components only run in Client
// Components. Without this directive the whole renderer becomes unimportable from a Server
// Component (the storefront renders server-side), which would defeat the point of sharing one
// renderer between the editor and the storefront.
//
// Marking just this module 'use client' keeps the boundary a small client island: a Server
// Component may render it and pass server-rendered `children`/`fallback` in as props, so the
// sections themselves (including async server components) still render on the server.
import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

// Required by docs/MACIERZ_ZGODNOSCI.md section 6 ("Error boundary per-sekcja"): one section
// throwing during render must not take down the rest of the page.
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
