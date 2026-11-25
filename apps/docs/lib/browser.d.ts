export {};

declare global {
  interface Window {
    __toggle_editor__?: () => void;
  }
}
