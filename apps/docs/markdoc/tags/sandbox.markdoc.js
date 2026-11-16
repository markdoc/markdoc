import { Sandbox } from '../../components/Sandbox';

export default {
  render: Sandbox,
  attributes: {
    height: { type: String },
    options: { type: Object }
  }
};
