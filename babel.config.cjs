module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-react'
  ],
  plugins: ['@babel/plugin-syntax-import-meta', '@babel/plugin-transform-modules-commonjs']
};
