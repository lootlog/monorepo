export const MOBILE_ALERT_STACK_ID = "ll-mobile-alert-stack";

export const getMobileAlertStackContainer = (): HTMLElement | null =>
  document.getElementById(MOBILE_ALERT_STACK_ID);
