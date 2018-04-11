export declare namespace Simple {
    enum CharType {
        NUMBER = 0,
        LETTER = 1,
    }
    interface IMaskChar {
        position: number;
        char: string | null | CharType;
    }
    interface IValueChar {
        position: number;
        char: string | null;
    }
    class Mask {
        caret: number;
        private mask;
        private value;
        private maskChar;
        private valueChar;
        constructor(value: string, mask: string, caret?: number);
        process(): string;
        private nextIMaskChar();
        private nextIValueChar(type);
    }
    function process(value: string, mask: string | string[]): string;
    function getMaskString(value: string, mask: string | string[]): string;
    function maskBuilder(value: string, mask: string | string[], caret?: number): Mask;
    function bind(inputElement: HTMLInputElement | Element, mask: string | string[], callback?: ((output: string) => void) | null): void;
}
export default Simple;
