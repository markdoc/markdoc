module.exports = {
  render: 'markdoc-callout',
  children: ['paragraph'],
  attributes: {
    type: {
      type: String,
      default: 'note',
      matches: ['check', 'error', 'note', 'warning']
    },
    title: {
      type: String
    }
  }
};
