import { error } from '../helpers/util';


export default async (ctx, next) => {
  try {
    await next();
  } catch (e) {
    await error(ctx, e);
  }
};
