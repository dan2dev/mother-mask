import Simple from "./simple";
export module MotherMask {
	export function process(value: string, pattern: string) : string {
		return Simple.process(value, pattern);
	}
	export function bind(input: HTMLInputElement | HTMLElement | Element, pattern: string, callback: (value: string) => void = null) : void {
		Simple.bind(input, pattern, callback);
	}
}
if(window !== undefined) {
	(window as any).MotherMask = MotherMask;
}
export default MotherMask; 