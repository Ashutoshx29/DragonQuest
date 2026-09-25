module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?|@expo/html-elements|@expo/prelude|react-navigation|@react-navigation|@expo/ui|@expo/vector-icons|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|drizzle-orm)',
  ],
  testMatch: ['**/__tests__/**/*.test.@(ts|tsx|js)'],
};
