module.exports = (ctx, next) => {
  const { username, first_name: firstName, last_name: lastName, id } = ctx.from;
  let content = '';

  switch (ctx.updateType) {
    case 'message':
      if (ctx.message.text) {
        content = ctx.message.text;
      } else if (ctx.message.sticker) {
        content = ctx.message.sticker.emoji;
      }

      break;

    case 'callback_query':
      content = ctx.callbackQuery.data;
      break;

    case 'inline_query':
      content = ctx.inlineQuery.query;
  }

  const text = `${ctx.me}:${username ? ` [${username}]` : ''} ${firstName + (lastName ? ` ${lastName}` : '')} (${id}): <${ctx.updateSubType || ctx.updateType}> ${content.replace(/\n/g, ' ')}`;
  console.log(text.length > 200 ? `${text.slice(0, 200)}...` : text);
  next();
};
