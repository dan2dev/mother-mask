// made by Danilo Celestino de Castro (dan2dev)
// import { Is } from "utility-collection/src/is";
export module Is {
  export function empty(value: any): boolean {
    if (value === undefined || value === null || value === "") {
      return true;
    } else {
      return false;
    }
  }
  // is Number
  const numberRegex: RegExp = /\D/;
  export function number(value: string): boolean {
    return !numberRegex.test(value);
  }

  // is Letter
  const letterRegex: RegExp = /[a-zA-Z]/;
  export function letter(value: string): boolean {
    return letterRegex.test(value);
  }
}

export namespace Simple {
  // detect ios for fix
  let isIos: boolean | undefined;
  function ios(): boolean {
    if (isIos !== undefined) {
      return isIos;
    } else {
      isIos = /iPad|iPhone|iPod/i.test(navigator.userAgent);
      return isIos;
    }
  }
  // ------
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

  export function process(value: string, mask: string | string[]) {
    const m = maskBuilder(value, mask);
    return m.process();
  }
  function getMaskString(value: string, mask: string | string[]) {
    if (Array.isArray(mask)) {
      let i: number = 0;
      while (value.length > mask[i].length && i < mask.length) {
        i++;
      }
      return mask[i];
    } else {
      return mask;
    }
  }
  function getMaxLength(mask: string | string[]): number {
    let maxLength: number = 0;
    if (Array.isArray(mask)) {
      mask.forEach((m) => {
        if (maxLength < m.length) {
          maxLength = m.length;
        }
      });
    } else {
      maxLength = mask.length;
    }
    return maxLength;
  }
  export function maskBuilder(value: string, mask: string | string[], caret: number = 0): Mask {
    return new Mask(value, getMaskString(value, mask), caret);
  }
  let lockInput: boolean = false;
  export function bind(
    inputElement: HTMLInputElement | Element,
    mask: string | string[],
    callback: ((output: string) => void) | null = null) {
    inputElement.setAttribute("autocomplete", "off");
    inputElement.setAttribute("autocorrect", "off");
    inputElement.setAttribute("autocapitalize", "off");
    inputElement.setAttribute("spellcheck", "false");

    inputElement.setAttribute("maxlength", getMaxLength(mask).toString());
    inputElement.addEventListener("paste", (e: Event) => {
      const target = e.target as HTMLInputElement;
      const oldValue = target.value.toString();
      requestAnimationFrame(() => {
        // target.value = process(target.value, mask);
        const m = maskBuilder(target.value, mask);
        target.value = m.process();
        if (callback != null) {
          callback(target.value);
        }
      });
    });
    inputElement.addEventListener((ios() ? "keyup" : "keydown"), (e: KeyboardEvent) => {

      const target = e.target as HTMLInputElement;

      if (e.key === undefined) {
        lockInput = true;
        requestAnimationFrame(() => {
          const selStartAfter = target.selectionStart || 999;
          const m = maskBuilder(target.value, mask, selStartAfter);
          target.value = m.process();
          if (e.which === 8) {
            target.setSelectionRange(selStartAfter, selStartAfter);
          } else {
            target.setSelectionRange(m.caret, m.caret);
          }
          requestAnimationFrame(() => {
            lockInput = false;
          });
        });
      } else {
        const oldValue = target.value.toString();
        // chars -------------------
        const isMeta = (e.key !== undefined) ? ("Meta" === e.key) : true;
        const isBackspace = (e.key !== undefined) ? ("Backspace" === e.key || e.keyCode === 8) : true;
        const isDelete = (e.key !== undefined) ? ("Delete" === e.key) : true;
        const isCharInsert = (e.key !== undefined) ? (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) : true;
        const isUnidentified = (e.key !== undefined) ? (e.key === "Unidentified") : false;
        // don't allow to insert more if it's full
        if (isCharInsert && target.selectionStart === target.selectionEnd) {
          if (oldValue.length >= getMaxLength(mask)) {
            if (!ios()) {
              e.preventDefault();
              return false;
            }
          }
        }
        if (lockInput) {
          e.preventDefault();
          return;
        }
        lockInput = true;
        requestAnimationFrame(() => {
          const selStartAfter = target.selectionStart || 999;
          // const m =  new Mask(target.value, mask, selStartAfter);
          const m = maskBuilder(target.value, mask, selStartAfter);
          target.value = m.process();
          // requestAnimationFrame(() => {
          target.value = target.value;
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
          requestAnimationFrame(() => {
            lockInput = false;
          });
          // });
        });
      }
    });
  }
}

export default Simple;
