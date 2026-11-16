import {html, css, LitElement} from 'lit';

export class MarkdocCallout extends LitElement {
  static styles = css`
  .note { background-color: #8792a2; }
  .caution { background-color: #d97917; }
  .check { background-color: #000000; }
  .warning { background-color: #ed5f74; }
  `;

  static properties = {
    type: {type: String},
  };

  constructor() {
    super();
    this.type = 'note';
  }

  render() {
    return html`<p class="${this.type}"><slot></slot></p>`;
  }
}
