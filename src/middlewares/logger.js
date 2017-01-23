export default function (ctx, next) {
  let { username, first_name, last_name, id } = ctx.from,
    content = '';

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
    
  let text = `${ctx.me}:${username ? ` [${username}]` : ''} ${first_name + (last_name ? ` ${last_name}` : '')} (${id}): <${ctx.updateSubType || ctx.updateType}> ${content.replace(/\n/g, ' ')}`;
  
  console.log(text.length > 200 ? `${text.slice(0, 200)}...` : text);
  next();
}