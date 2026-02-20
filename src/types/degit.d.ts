declare module 'degit' {
  interface DegitOptions {
    cache?: boolean;
    force?: boolean;
    verbose?: boolean;
  }
  function degit(source: string, options?: DegitOptions): { clone(dest: string): Promise<void> };
  export default degit;
}
