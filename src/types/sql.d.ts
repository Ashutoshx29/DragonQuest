/**
 * SQL files are inlined as strings by babel-plugin-inline-import
 * (see babel.config.js / metro.config.js) and consumed by the drizzle migrator.
 */
declare module '*.sql' {
  const content: string;
  export default content;
}
