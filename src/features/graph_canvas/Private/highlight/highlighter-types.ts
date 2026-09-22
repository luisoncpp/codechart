// @Architecture(descriptionShort="Token and Rule shapes shared by the highlighter, its rule sets and the tokenizer")

export interface Token {
  type: string;
  text: string;
}

export interface Rule {
  type: string;
  regex: RegExp;
}
