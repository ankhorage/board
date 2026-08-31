import { createConfig } from '@ankhorage/devtools/eslint';

const NON_SOURCE_FILES = ['test/**/*.ts', 'paradox.config.ts'];

function legacyRuleExceptions(rule, files) {
  return { files, rules: { [rule]: 'off' } };
}

export default [
  ...createConfig({
    files: NON_SOURCE_FILES,
    profile: 'base',
    project: ['./tsconfig.json'],
    tsconfigRootDir: import.meta.dirname,
  }),
  legacyRuleExceptions('max-lines', ['src/webInspection.ts']),
  legacyRuleExceptions('max-lines-per-function', [
    'src/commands.ts',
    'src/planning.ts',
    'src/webInspection.ts',
    'test/ankh.provider.test.ts',
    'test/cli.test.ts',
    'test/commands.test.ts',
    'test/planning.test.ts',
    'test/webInspection.test.ts',
  ]),
  legacyRuleExceptions('security/detect-object-injection', [
    'src/commands.ts',
    'src/webInspection.ts',
    'test/package.test.ts',
  ]),
];
