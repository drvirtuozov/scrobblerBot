export default (ctx, next) => {
  process.nextTick(next);
};
