import {
  initializeErrorMonitoring,
  triggerErrorMonitoringTest,
} from "@/lib/error-monitoring";

initializeErrorMonitoring();

if (import.meta.env.DEV) {
  const handleSentryTest = () => {
    triggerErrorMonitoringTest();
  };

  document.addEventListener("lootlog:sentry-test", handleSentryTest);
  import.meta.hot?.dispose(() => {
    document.removeEventListener("lootlog:sentry-test", handleSentryTest);
  });
}
