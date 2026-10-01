module.exports = {
  preset: '@react-native/jest-preset',
  // The default preset doesn't transform these packages' ESM/TS source builds,
  // which useCategoryOverrides and LimitSheet pull in via real (unmocked) imports.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|react-native-calendars|react-native-swipe-gestures|recyclerlistview)/)',
  ],
};
