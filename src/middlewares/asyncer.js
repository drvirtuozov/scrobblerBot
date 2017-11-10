module.exports = (ctx, next) => {
  process.nextTick(next);
};
