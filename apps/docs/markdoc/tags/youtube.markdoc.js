import { YouTube } from '../../components/YouTube';

export default {
  render: YouTube,
  attributes: {
    src: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    width: {
      type: String,
      default: '50%'
    }
  }
};
