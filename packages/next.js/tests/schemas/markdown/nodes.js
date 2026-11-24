function Heading() {}
function Code() {}

export const heading = {
  render: Heading,
  attributes: { level: { type: Number } },
};
export const fence = {
  render: Code,
  attributes: { language: { type: String } },
};
