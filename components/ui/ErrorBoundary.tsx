"use client";

import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-sm">
          <p className="font-semibold mb-1">Something went wrong rendering this message.</p>
          <pre className="overflow-auto max-h-32 text-xs">{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
