export default {
  root: process.cwd(),
  test: {
    fileParallelism: false,
    hookTimeout: 180_000,
    include: ["test/database-cutover.e2e-spec.ts"],
    testTimeout: 180_000,
  },
};
