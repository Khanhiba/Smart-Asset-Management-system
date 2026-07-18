import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error('Unhandled application error', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-700"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-card"><p className="eyebrow">Nexus Assets</p><h1 className="mt-2 text-2xl font-extrabold text-ink">Something went wrong</h1><p className="mt-3 text-sm leading-6 text-slate-500">Your data is safe. Refresh the application to restore your session.</p><button type="button" onClick={() => window.location.reload()} className="btn-primary mt-6">Refresh application</button></section></main>;
  }
}
