/// <reference types="vite/client" />

declare module 'alpinejs' {
  interface Alpine {
    data(name: string, callback: () => Record<string, unknown>): void
    start(): void
  }
  const Alpine: Alpine
  export default Alpine
}

interface Window {
  showDirectoryPicker(options?: { mode?: string }): Promise<FileSystemDirectoryHandle>
  Alpine: unknown
}

declare module '@editorjs/list'
declare module '@editorjs/link'
declare module '@editorjs/embed'

interface FileSystemDirectoryHandle {
  requestPermission(descriptor?: { mode?: string }): Promise<PermissionState>
}
