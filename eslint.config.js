// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    rules: {
      // react-native-reanimated shared values (`sv.value = x` inside event
      // handlers / worklets) are the sanctioned animation pattern in this
      // codebase. The React-Compiler immutability rule cannot see through
      // Reanimated's mutable ref and false-positives on every write.
      'react-hooks/immutability': 'off',
    },
  },
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', '.expo-dev.log', 'scripts/_tmp*'],
  },
]);
