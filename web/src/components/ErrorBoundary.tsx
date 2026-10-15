import { Component, ErrorInfo, JSX, ReactNode } from "react";

export interface IErrorBoundaryProps {
  fallback?: JSX.Element | string;
  children?: ReactNode;
  // the error is cleared when this value changes (e.g. on navigation)
  resetKey?: unknown;
}

export interface IErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<
  IErrorBoundaryProps,
  IErrorBoundaryState
> {
  //   state = { hasError: false, error: undefined };
  constructor(props: IErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: IErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.log(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="error">{this.state.error?.message}</div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
