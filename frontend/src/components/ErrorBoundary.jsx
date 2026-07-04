import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-black text-rose-600 mb-4">Application Error Boundary</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              A critical runtime error has occurred:
            </p>
            <pre className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-mono overflow-auto max-h-60 border border-slate-200 dark:border-slate-700 text-rose-500">
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="mt-6 w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
