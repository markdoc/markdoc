export default class Raw {
  readonly $$mdtype = 'Raw' as const;

  static isRaw = (node: any): node is Raw => {
    return !!(node?.$$mdtype === 'Raw');
  };

  content: string;
  inline: boolean;

  constructor(content: string, inline: boolean) {
    this.content = content;
    this.inline = inline;
  }
}
