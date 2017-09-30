export declare module MotherMask {
    function process(value: string, pattern: string): string;
    function bind(input: HTMLInputElement | HTMLElement | Element, pattern: string, callback?: (value: string) => void): void;
}
export default MotherMask;
