// made by Danilo Celestino de Castro (dan2dev)
import { Is } from "utility-collection";

export namespace Simple {
	export enum CharType { NUMBER, LETTER }
	export interface IMaskChar {
		position: number;
		char: string | null | CharType;
	}
	export interface IValueChar {
		position: number;
		char: string | null;
	}
	// -----------
	export class Mask {
		public caret: number = 0;
		private mask: string;
		private value: string;
		private maskChar: Simple.IMaskChar = {
			position: -1,
			char: null,
		};
		private valueChar: Simple.IValueChar = {
			position: -1,
			char: null,
		};
		// -----------------------

		constructor(value: string, mask: string, caret: number = 0) {
			this.value = value;
			this.mask = mask;
			this.caret = caret;
		}
		public process(): string {
			if (Is.empty(this.value)) {
				return "";
			}
			let output: string = "";
			const oldCaret: number = this.caret;
			const shadowLatestIMaskChars: string[] = [];
			while (this.nextIMaskChar()) {
				if (typeof this.maskChar.char === "string") {
					shadowLatestIMaskChars.push(this.maskChar.char);
				} else {
					if (this.nextIValueChar(this.maskChar.char!) && !Is.empty(this.valueChar.char)) {
						while (shadowLatestIMaskChars.length > 0) {
							if (
								this.maskChar.position <= this.caret + 1 &&
								this.maskChar.position >= this.caret
							) {
								this.caret++;
							}
							output += shadowLatestIMaskChars.shift();
						}
						output += this.valueChar.char;
					}
				}
			}
			return output;
		}

		private nextIMaskChar(): boolean {
			this.maskChar.position++;
			if (this.maskChar.position > this.mask.length) {
				return false;
			} else {
				// what to return
				this.maskChar.char = this.mask.charAt(this.maskChar.position);
				if (this.maskChar.char === "9") {
					this.maskChar.char = Simple.CharType.NUMBER;
				} else if (this.maskChar.char === "Z") {
					this.maskChar.char = Simple.CharType.LETTER;
				}
				return true;
			}
		}
		// value

		private nextIValueChar(type: Simple.CharType): string | boolean {
			this.valueChar.position++;
			if (this.valueChar.position > this.value.length) {
				return false;
			} else {
				this.valueChar.char = this.value.charAt(this.valueChar.position);
				if (type === Simple.CharType.NUMBER) {
					if (Is.number(this.valueChar.char)) { return true; }
				} else if (type === Simple.CharType.LETTER) {
					if (Is.letter(this.valueChar.char)) { return true; }
				}
				return this.nextIValueChar(type);
			}
		}

	}

	export function process(value: string, mask: string) {
		const instance = new Mask(value, mask);
		return instance.process();
	}

	export function bind(inputElement: HTMLInputElement | Element, mask: string, callback: ((output: string) => void) | null = null) {
		inputElement.addEventListener("paste", (e: Event) => {
			const target = e.target as HTMLInputElement;
			const oldValue = target.value.toString();
			requestAnimationFrame(() => {
				const m = new Mask(target.value, mask);
				target.value = m.process();
				if (callback != null) {
					callback(target.value);
				}
			});
		});

		inputElement.addEventListener("keydown", (e: KeyboardEvent) => {
			const target = e.target as HTMLInputElement;
			const oldValue = target.value.toString();
			// chars -------------------
			const isBackspace = ("Backspace" === e.key || e.keyCode === 8);
			const isDelete = ("Delete" === e.key);
			const isCharInsert = (e.key.length === 1 && !e.ctrlKey && !e.altKey);
			const isUnidentified = (e.key === "Unidentified");
			// don't allow to insert more if it's full
			if (isCharInsert && target.selectionStart === target.selectionEnd) {
				if (oldValue.length >= mask.length) {
					e.preventDefault();
				}
			}
			setImmediate(() => {
				const selStartAfter = target.selectionStart;
				const m = new Mask(target.value, mask, selStartAfter);
				target.value = m.process();
				// fix caret position
				if (isUnidentified) {
					if (target.value.length > oldValue.length) {
						target.setSelectionRange(m.caret, m.caret);
					} else {
						target.setSelectionRange(selStartAfter, selStartAfter);
					}
				} else {
					if (isDelete) {
						if (oldValue.length === target.value.length) {
							target.setSelectionRange(selStartAfter + 1, selStartAfter + 1);
						} else {
							target.setSelectionRange(selStartAfter, selStartAfter);
						}
					}
					if (isBackspace) {
						target.setSelectionRange(selStartAfter, selStartAfter);
					}
					if (isCharInsert) {
						target.setSelectionRange(m.caret, m.caret);
					}
				}
				if (callback != null) {
					callback(target.value);
				}
			});
		});
	}
}

// How to --------------------------
// Simple.process("01215344139", "999.999.999-99");
// var element = document.getElementById("mask1") as HTMLInputElement;
// Simple.bind(element, "999.999.999-99");

export default Simple;
