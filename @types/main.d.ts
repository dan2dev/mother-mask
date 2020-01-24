export declare module MotherMask {
    function process(value: string, pattern: string | string[]): string;
    function bind(input: HTMLInputElement | HTMLElement | Element, pattern: string | string[], callback?: ((value: string) => void) | null): void;
}
export default MotherMask;
