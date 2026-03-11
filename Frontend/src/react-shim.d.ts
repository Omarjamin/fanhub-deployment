declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "react" {
  export type FormEvent<T = any> = any;
  export type ReactNode = any;
  export type ReactElement = any;
  export type FC<P = any> = (props: P) => any;
  export function useState<T = any>(initialState?: T): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function useRef<T = any>(value?: T): { current: T };
  export function createElement(type: any, props?: any, ...children: any[]): any;
  const React: {
    createElement: typeof createElement;
  };
  export default React;
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: any): void;
    unmount(): void;
  };
}

declare module "react/jsx-runtime" {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}
