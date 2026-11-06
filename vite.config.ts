// The optional path lets sandbox validation keep installed dependencies in scratch.
// A normal `npm ci && npm run build` needs no environment configuration.
const deps = process.env.ROUND_PROPHET_DEPS;
export default {
  base: "./",
  resolve: deps
    ? {
        alias: [
          { find: /^react-dom(\/.*)?$/, replacement: `${deps}/react-dom$1` },
          { find: /^react(\/.*)?$/, replacement: `${deps}/react$1` },
          {
            find: "lossless-json",
            replacement: `${deps}/lossless-json/lib/esm/index.js`,
          },
        ],
      }
    : {},
  build: { target: "es2022" },
};
