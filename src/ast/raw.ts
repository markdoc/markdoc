export default class Raw {
  readonly $$mdtype = 'Raw' as const;

  content: string;
  inline: boolean;

  constructor(content: string, inline: boolean) {
    this.content = content;
    this.inline = inline;
  }
}
