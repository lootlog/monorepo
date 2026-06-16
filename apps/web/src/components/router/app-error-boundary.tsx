import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
  fallback: (reset: () => void) => ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error("Uncaught application error", error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return this.props.fallback(this.reset);
    }

    return this.props.children;
  }
}
