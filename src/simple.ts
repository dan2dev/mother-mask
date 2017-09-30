// Made by Danilo Celestino de Castro (dan2dev)
import { Is } from "utility-collection";

export module Simple {
	export enum CharType { NUMBER, LETTER }
	export interface MaskChar {
		position: number;
		char: string | CharType;
	}
	export interface ValueChar {
		position: number;
		char: string;
	}
	// -----------
	class Mask {
		mask: string;
		value: string;
		caret: number = 0;
		// -----------------------
		constructor(value: string, mask: string, caret: number = 0) {
			this.value = value;
			this.mask = mask;
			this.caret = caret;
		}
		// cursors -------------
		// mask
		maskChar: Simple.MaskChar = {
			position: -1,
			char: null
		};
		public nextMaskChar(): boolean {
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
		valueChar: Simple.ValueChar = {
			position: -1,
			char: null
		};
		nextValueChar(type: Simple.CharType): string | boolean {
			this.valueChar.position++;
			if (this.valueChar.position > this.value.length) {
				return false;
			} else {
				this.valueChar.char = this.value.charAt(this.valueChar.position);
				if (type === Simple.CharType.NUMBER) {
					if (Is.number(this.valueChar.char)) return true;
				} else if (type === Simple.CharType.LETTER) {
					if (Is.letter(this.valueChar.char)) return true;
				} 
				return this.nextValueChar(type);
			}
		}
		process(): string {
			var output: string = "";
			var oldCaret: number = this.caret;
			var shadowLatestMaskChars: Array<string> = [];
			while (this.nextMaskChar()) {
				if (typeof this.maskChar.char === 'string') {
					shadowLatestMaskChars.push(this.maskChar.char);
				} else {
					if (this.nextValueChar(this.maskChar.char) && !Is.empty(this.valueChar.char)) {
						while (shadowLatestMaskChars.length > 0) {
							if (
								this.maskChar.position <= this.caret + 1 &&
								this.maskChar.position >= this.caret
							) {
								this.caret++;
							}
							output += shadowLatestMaskChars.shift();
						}
						output += this.valueChar.char;
					}
				}
			}
			return output;
		}
	}


	export function process(value: string, mask: string) {
		var instance = new Mask(value, mask);
		return instance.process();
	}
	export function bind(inputElement: HTMLInputElement | Element, mask: string, callback: (output: string) => void = null) {
		inputElement.addEventListener("paste", (e: Event) => {
			var target = e.target as HTMLInputElement;
			var oldValue = target.value.toString();
			requestAnimationFrame(() => {
				var m = new Mask(target.value, mask);
				target.value = m.process();
				if (callback != null) {
					callback(target.value);
				}
			});
		});

		inputElement.addEventListener("keydown", (e: KeyboardEvent) => {
			var target = e.target as HTMLInputElement;
			var oldValue = target.value.toString();
			// chars -------------------
			var isBackspace = ("Backspace" === e.key );
			var isDelete = ("Delete" === e.key);
			var isCharInsert = (e.key.length === 1 && !e.ctrlKey && !e.altKey);
			// don't allow to insert more if it's full
			if (isCharInsert && target.selectionStart === target.selectionEnd) {
				if (oldValue.length >= mask.length) {
					e.preventDefault();
				}
			}
			requestAnimationFrame(() => {
				var selStartAfter = target.selectionStart;
				var m = new Mask(target.value, mask, selStartAfter);
				target.value = m.process();
				// fix caret position
				if (isDelete) {
					if (oldValue.length === target.value.length) {
						target.setSelectionRange(selStartAfter +1, selStartAfter +1);
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
				if (callback != null) {
					callback(target.value);
				}
			});
		});
	}
}

// How to --------------------------
//Simple.process("01215344139", "999.999.999-99");
//var element = document.getElementById("mask1") as HTMLInputElement;
//Simple.bind(element, "999.999.999-99");

export default Simple;
