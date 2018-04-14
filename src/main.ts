import Simple from "./simple";
export namespace MotherMask {
	export function process(value: string, pattern: string | string[]): string {
		return Simple.process(value, pattern);
	}
	export function bind(
		input: HTMLInputElement | HTMLElement | Element,
		pattern: string | string[],
		callback: ((value: string) => void) | null = null): void {
			Simple.bind(input, pattern, callback);
	}
}
if (window !== undefined) {
	(window as any).MotherMask = MotherMask;
}
export default MotherMask;
