import { Callout } from '../../components/Callout';

export default {
  render: Callout,
  children: ['paragraph', 'tag', 'list'],
  attributes: {
    type: {
      type: String,
      default: 'note',
      matches: ['caution', 'check', 'note', 'warning'],
      errorLevel: 'critical'
    },
    title: {
      type: String
    }
  }
};
