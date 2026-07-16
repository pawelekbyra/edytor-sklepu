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
