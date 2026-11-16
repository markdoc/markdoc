module.exports = {
  render: 'Callout',
  children: ['paragraph', 'tag', 'list'],
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
