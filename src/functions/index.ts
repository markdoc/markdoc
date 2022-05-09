import type { ConfigFunction } from '../types';
import { truthy } from '../tags/conditional';

const and: ConfigFunction = {
  transform(parameters) {
    return Object.values(parameters).every((x) => truthy(x));
  },
};

const or: ConfigFunction = {
  transform(parameters) {
    return Object.values(parameters).find((x) => truthy(x)) !== undefined;
  },
};

const not: ConfigFunction = {
  parameters: {
    0: { required: true },
  },

  transform(parameters) {
    return !truthy(parameters[0]);
  },
};

const equals: ConfigFunction = {
  transform(parameters) {
    const values = Object.values(parameters);
    return values.every((v) => v === values[0]);
  },
};

const debug: ConfigFunction = {
  transform(parameters) {
    return JSON.stringify(parameters[0], null, 2);
  },
};

const defaultFn: ConfigFunction = {
  transform(parameters) {
    return parameters[0] === undefined ? parameters[1] : parameters[0];
  },
};

export default { and, or, not, equals, default: defaultFn, debug };
