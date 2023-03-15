export default class UnsafeRaw {
  readonly $$mdtype = 'UnsafeRaw' as const;

  static isUnsafeRaw = (node: any): node is UnsafeRaw => {
    return !!(node?.$$mdtype === 'UnsafeRaw');
  };

  content: string;
  inline: boolean;

  constructor(content: string, inline: boolean) {
    this.content = content;
    this.inline = inline;
  }
}
