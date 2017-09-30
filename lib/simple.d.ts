export declare module Simple {
    enum CharType {
        NUMBER = 0,
        LETTER = 1,
    }
    interface MaskChar {
        position: number;
        char: string | CharType;
    }
    interface ValueChar {
        position: number;
        char: string;
    }
    function process(value: string, mask: string): string;
    function bind(inputElement: HTMLInputElement | Element, mask: string, callback?: (output: string) => void): void;
}
export default Simple;
