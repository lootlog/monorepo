import { Component, type ErrorInfo, type ReactNode } from "react";
import { releaseStartupScreen } from "@/lib/startup-screen";

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

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error", error, errorInfo);
    // The router never resolves after a crash, so the startup screen would
    // hide the recovery actions.
    releaseStartupScreen();
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
