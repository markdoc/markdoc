import { Diagram } from '../../components/Diagram';

export default {
  render: Diagram,
  attributes: {
    type: {
      type: String,
      required: true,
      matches: ['flowchart']
    }
  }
};
