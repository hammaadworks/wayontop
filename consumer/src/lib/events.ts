export const showAlert = (message: string) => {
  window.dispatchEvent(new CustomEvent('app-alert', { detail: message }));
};
