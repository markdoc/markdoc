import { Ascii, TYPE_MAP } from '../../components/Ascii';

const matches = Object.keys(TYPE_MAP);

export default {
  render: Ascii,
  attributes: {
    primary: {
      type: String,
      matches
    }
  }
};
