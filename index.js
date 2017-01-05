const crypto = require('crypto');
const request = require('axios');
const Bot = require('botogram');
const User = require('./models/user');
const bot = new Bot(process.env.SCROBBLER);
const url = 'http://ws.audioscrobbler.com/2.0/?method=';
const api_key = process.env.SCROBBLER_API_KEY;
const secret = process.env.SCROBBLER_SECRET;
const discogsKey = process.env.SCROBBLER_DISCOGS_KEY;
const discogsSecret = process.env.SCROBBLER_DISCOGS_SECRET;
const songs = require('./songs.json');

bot.on("/start", (message, next) => {
  User.findById(message.from.id)
    .then(user => {
      if (!user) {
        return User.create({
          _id: message.from.id,
          username: message.from.username
        })
        .then(() => {
          return message.echo(`Hello, ${message.from.first_name}!\n\nThis bot provides you the ability to scrobble songs, albums or lists of songs in text mode. To take advantage of these opportunities you have to grant access to your Last.fm account...`);
        })
        .then(() => {
          return auth(message);
        })
        .then(() => {
          sendToAdmin(`We've got a new user! @${message.from.username}`);
        });
      } else {
        next();
      }
    })
    .catch(err => {
      error(message, err);
    });
});

bot.on("text", message => {
  isUserAuthorized(message.from.id, yes => {
    yes ? scrobbleSong(message) : auth(message);
  });
});

bot.on("/alert", (message, next) => {
  if (message.from.id === 1501719) {
    message.echo('Type an alert... /cancel')
    .then(() => {
      bot.setUserMilestone('alert', message.from.id);
    });
  } else {
    next();
  }
});

bot.on("callback_query", query => {
  if (query.data === "ACCESS_GRANTED") {
    User.findById(query.from.id)
      .then(user => {
        let token = user.token,
          sig = md5(`api_key${api_key}methodauth.getsessiontoken${token}${secret}`),
          song = getRandomFavSong();
        
        return request(`${url}auth.getsession&format=json&token=${token}&api_key=${api_key}&api_sig=${sig}`)
          .then(res => {
            let username = res.data.session.name;
            
            bot.editMessageText({
              message_id: query.message.message_id,
              text: `Glad to see you, <a href="http://www.last.fm/user/${username}">${username}</a>!\n\nNow you can scrobble your first song. To do it just type artist name, song name and album title separated by new lines. Example:\n\n${song.artist}\n${song.name}\n${song.album}\n\nType /help for more info.`,
              chat_id: query.from.id,
              parse_mode: "HTML",
              disable_web_page_preview: true
            });
            
            return User.findByIdAndUpdate(query.from.id, {
              account: res.data.session.name, 
              key: res.data.session.key
            });
          });
      })
      .catch(err => {
        return error(query, err);
      });
  }
});

bot.milestone('wish', milestone => {
  milestone.on('text', message => {
    sendToAdmin(`A wish from @${message.from.username}: ${message.text}`)
      .then(() => {
        return message.echo('Thanks! We have successfully received your wish.');
      })
      .then(() => {
        bot.setUserMilestone('source', message.from.id);
      });
  });
  
  milestone.on('/cancel', message => {
    message.echo('Canceled.')
      .then(() => {
        bot.setUserMilestone('source', message.from.id);
      });
  });
});

bot.milestone('report', milestone => {
  milestone.on('text', message => {
    sendToAdmin(`A report from @${message.from.username}: ${message.text}`)
      .then(() => {
        return message.echo('Thanks! We have successfully received your bug report.');
      })
      .then(() => {
        bot.setUserMilestone('source', message.from.id);
      });
  });
  
  milestone.on('/cancel', message => {
    message.echo('Canceled.')
      .then(() => {
        bot.setUserMilestone('source', message.from.id);
      });
  });
});

bot.milestone('search_song', milestone => {
  milestone.on('inline_query', query => {
    if (!query.query) return query.echo('Type your query below...');
    
    request(`${url}track.search&track=${encodeURI(query.query)}&api_key=${api_key}&format=json`)
      .then(res => {
        let tracks = res.data.results.trackmatches.track;
        
        let results = tracks  
          .map((track, i) => {
            let photo_url = track.image[2]['#text'] || 'http://img2-ak.lst.fm/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png';
            
            return {
              type: 'article',
              id: String(i),
              thumb_url: photo_url,
              photo_width: 174,
              photo_height: 174,
              title: track.name,
              description: `${track.artist}`,
              input_message_content: {
                message_text: `${track.artist}\n${track.name}`
              }
            };
          });
          
        return bot.answerInlineQuery({
          inline_query_id: query.id,
          results: results,
        });
      })
      .catch(err => {
        return error(query, err);
      });
  });
  
  milestone.on('text', message => {
    let track = message.text.split('\n');
    
    if (track.length > 2) {
      scrobbleSong(message);
    } else if (track.length == 2) {
      request(encodeURI(`${url}track.getInfo&api_key=${api_key}&artist=${track[0]}&track=${track[1]}&format=json`))
        .then(res => {
          if (res.data.error) {
            scrobbleSong(message);
            throw undefined;
          }
          
          let track = res.data.track || {};
            track.album = track.album || {};
          let artist = track.artist.name || '',
            name = track.name || '',
            album = track.album.title || '';
          
          return User.findByIdAndUpdate(message.from.id, { track: { name, artist, album } }, { new: true });
        })
        .then(user => {
          let track = user.track;
          
          if (track.album) {
            return bot.sendMessage({
              chat_id: message.from.id,
              text: `Last.fm has additional data about this track:\n\n${track.artist}\n${track.name}\n${track.album}\n\nWould you like to scrobble this track with the new data or leave it as is?`,
              disable_web_page_preview: true,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Scr with new data', callback_data: 'SCR' }, 
                    { text: 'Leave it as is', callback_data: 'LEAVE' }
                  ],
                  [
                    { text: 'Cancel', callback_data: 'CANCEL' }  
                  ]
                ]
              }
            });
          } else {
            return bot.sendMessage({
              chat_id: message.from.id,
              text: `Last.fm has no album data about this track. Would you like to enter album title?`,
              disable_web_page_preview: true,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Yes', callback_data: 'YES' }, 
                    { text: 'No', callback_data: 'NO' }
                  ]
                ]
              }
            });
          }
        })
        .catch(err => {
          return error(message, err);
        });
    } else {
      message.echo('Format:\n\nArtist\nSong Name\nAlbum Title');
    }
  });
  
  milestone.on('callback_query', query => {
    if (query.data === 'SCR') {
      scrobbleSong(query);
    } else if (query.data === 'LEAVE') {
      scrobbleSong(query, false);
    } else if (query.data === 'YES') {
      bot.setUserMilestone('edit_track_album', query.from.id);
      bot.editMessageText({
        chat_id: query.from.id,
        message_id: query.message.message_id,
        text: 'Send me album title please.'
      });
    } else if (query.data === 'NO') {
      scrobbleSong(query, false);
    } else if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
});

bot.milestone('edit_track_album', milestone => {
  milestone.on('text', message => {
    let album = message.text;
    
    User.findByIdAndUpdate(message.from.id, { 'track.album': album })
      .then(() => {
        message.text = '';
        scrobbleSong(message);
      })
      .catch(err => {
        error(message, err);
      });
  });
});

bot.milestone('song_list', milestone => {
  milestone.on('text', message => {
    Promise.resolve()
      .then(() => {
        let tracks = message.text.split('\n')
          .map(string => {
            if (string.split('|').length < 2) {
              message.echo('Please, send me valid data with this syntax:\n\nArtist | Song Name | Album Title');
              throw undefined;
            }
            
            let track = string.split('|');
            
            return {
              name: track[1],
              artist: track[0],
              album: track[2] || '',
              duration: 300
            };
          }),
          parts = [];
          
          while (tracks[0]) {
            parts.push(tracks.slice(0, 50));
            tracks = tracks.slice(50);
          }
        
        return parts;
      })
      .then(parts => {
        return User.findById(message.from.id)
          .then(user => {
            return Promise.all(parts.map(part => scrobbleSongs(part, user.key)));
          });
      })
      .then(results => {
        let ignored = [];
        
        results.forEach(result => {
          result.data.scrobbles.scrobble
            .filter(scrobble => scrobble.ignoredMessage.code === '1')
            .forEach(scr => ignored.push(scr));
        });
        
        if (ignored.length)
          return successfulScrobble(message, `Success, but...\nThe following tracks have been ignored:\n\n${ignored.map(track => `${track.artist['#text']} | ${track.track['#text']} | ${track.album['#text']}`).join('\n')}`);
        
        return successfulScrobble(message);
      })
      .catch(err => {
        return unsuccessfulScrobble(message, err);
      });
  });
  
  milestone.on('callback_query', query => {
    if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
});

bot.milestone('search_album', milestone => {
  milestone.on('inline_query', query => {
    if (!query.query) return query.echo('Type your query below...');
    
    request(encodeURI(`${url}album.search&album=${query.query}&api_key=${api_key}&format=json`))
      .then(res => {
        let albums = res.data.results.albummatches.album;
        
        let results = albums
          .filter(album => album.name !== '(null)')
          .map((album, i) => {
            let photo_url = album.image[2]['#text'] || 'http://img2-ak.lst.fm/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png';
            
            return {
              type: 'article',
              id: String(i),
              thumb_url: photo_url,
              photo_width: 174,
              photo_height: 174,
              title: album.name,
              description: album.artist,
              input_message_content: {
                message_text: `${album.artist}\n${album.name}`
              }
            };
        });
        
        return bot.answerInlineQuery({
          inline_query_id: query.id,
          results: results,
        });
      })
      .catch(err => {
        return error(query, err);
      });
  });
  
  milestone.on('text', message => {
    let album = message.text.split('\n'),
      title = album[1],
      artist = album[0],
      foundOn = '',
      discogsResults = [];
      
    if (album.length < 2) return message.echo('Format:\n\nArtist\nAlbum Title');
    
    User.findByIdAndUpdate(message.from.id, { album: { title, artist }})
      .then(() => {
        
        return Promise.all([
          request(encodeURI(`https://api.discogs.com/database/search?artist=${artist}&release_title=${title}&type=release&key=${discogsKey}&secret=${discogsSecret}`)),
          request(encodeURI(`${url}album.getinfo&api_key=${api_key}&artist=${artist}&album=${title}&format=json`))
        ]);
      })
      .then(results => {
        if (results[0].data.results[0]) {
          let id = results[0].data.results[0].id;
          discogsResults = results[0].data.results;
          discogsResults.unshift({});
        
          return User.findByIdAndUpdate(message.from.id, { discogsResults })
            .then(() => {
              return request(`https://api.discogs.com/releases/${id}`);
            })
            .then(res => {
              if (res.data.tracklist.length) {
                let tracks = res.data.tracklist
                  .map(track => { 
                    let dur = track.duration.split(':'); 
                    return { name: track.title, duration: dur[0] * 60 + +dur[1] };
                  });
                
                foundOn = 'Discogs.com';
                return tracks;
              }
            });
        } else if (results[1].data.album && results[1].data.album.tracks.track.length) {
          let album = results[1].data.album,
            tracks = album.tracks.track.map(track => { 
              return { name: track.name, duration: track.duration };
            });
            
          foundOn = 'Last.fm';
          return tracks;
        } else {
          throw undefined;
        }
      })
      .catch(() => {
        bot.sendMessage({
          chat_id: message.from.id,
          text: 'Last.fm and Discogs.com don\'t have any data about this album. Would you like to enter album tracklist manually?',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Yes', callback_data: 'YES' }, 
              { text: 'Cancel', callback_data: 'CANCEL' }
            ]]
          }
        })
        .then(() => {
          bot.setUserMilestone('no_info', message.from.id);
        });
      })
      .then(tracks => {
        return User.findByIdAndUpdate(message.from.id, { 'album.tracks': tracks }, { new: true });
      })
      .then(user => {
        let album = user.album,
          name = album.title,
          artist = album.artist,
          inline_keyboard = foundOn === 'Discogs.com' ? 
            [[
              { text: 'Edit', callback_data: 'EDIT' },
              { text: '⬅️', callback_data: 'PREV' },
              { text: '➡️', callback_data: 'NEXT' },
              { text: 'Cancel', callback_data: 'CANCEL' }  
            ],
            [
              { text: 'OK', callback_data: 'OK' }
            ]] : 
            [[
              { text: 'OK', callback_data: 'OK' }, 
              { text: 'Edit', callback_data: 'EDIT' },
              { text: 'Cancel', callback_data: 'CANCEL' }
            ]];
        
        return bot.sendMessage({
          chat_id: message.from.id,
          text: `You are about to scrobble [${name}](${encodeURI(`http://www.last.fm/music/${artist}/${name}`)}) by [${artist}](${encodeURI(`http://www.last.fm/music/${artist}`)}). The following tracks have been found on ${foundOn} and will be scrobbled:\n\n${album.tracks.map(track => track.name).join('\n')}${foundOn === 'Discogs.com' ? `\n\nResults: 1 of ${discogsResults.length - 1}` : ''}`,
          disable_web_page_preview: true,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard
          }
        });
      })
      .then(() => {
        bot.setUserMilestone('album_chosen', message.from.id);
      })
      .catch(err => {
        return error(message, err);
      });
  });
  
  milestone.on('callback_query', query => {
    if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
});

bot.milestone('album_chosen', milestone => {
  milestone.on('callback_query', query => {
    if (query.data === 'OK') {
      scrobbleAlbum(query)
        .then(() => {
          return successfulScrobble(query);
        })
        .catch(err => {
          return unsuccessfulScrobble(query, err);
        });
    } else if (query.data === 'EDIT') {
      User.findById(query.from.id)
        .then(user => {
          return bot.editMessageText({
            chat_id: query.from.id,
            message_id: query.message.message_id,
            text: `Edit the tracklist and send it back to me:\n\n${user.album.tracks.map(track => track.name).join('\n')}`,
            reply_markup: {
              inline_keyboard: [[
                { text: 'Cancel', callback_data: 'CANCEL' }  
              ]]
            }
          });
        })
        .then(() => {
          bot.setUserMilestone('edit_album', query.from.id);
        })
        .catch(err => {
          error(query, err);
        });
    } else if (query.data === 'PREV') {
      nextAlbum(query, 'PREV');
    } else if (query.data === 'NEXT') { 
      nextAlbum(query, 'NEXT');  
    } else if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
});

bot.milestone('edit_album', milestone => {
  milestone.on('text', message => {
    let tracks = message.text.split('\n').map(name => { return { name } });
    
    User.findByIdAndUpdate(message.from.id, { 'album.tracks': tracks })
      .then(() => {
        return scrobbleAlbum(message);
      })
      .then(() => {
        return successfulScrobble(message);
      })
      .catch(err => {
        return unsuccessfulScrobble(message, err);
      });
  });
  
  milestone.on('callback_query', query => {
    if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
});

bot.milestone('no_info', milestone => {
  milestone.on('callback_query', query => {
    if (query.data === 'YES') {
      bot.editMessageText({
        chat_id: query.from.id,
        message_id: query.message.message_id,
        text: 'Just send me song names of the album separated by new lines.',
        reply_markup: {
          inline_keyboard: [[
            { text: 'Cancel', callback_data: 'CANCEL' }
          ]]
        }
      })
      .then(() => {
        bot.setUserMilestone('set_tracks', query.from.id);
      });
    } else if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
});

bot.milestone('set_tracks', milestone => {
  milestone.on('text', message => {
    let tracks = message.text.split('\n')
      .map(track => { return { name: track }});
    
    if (tracks.length <= 1) 
      return message.echo('Send me song names separated by new lines.');
    
    User.findByIdAndUpdate(message.from.id, { 'album.tracks': tracks })
      .then(() => {
        return scrobbleAlbum(message);
      })
      .then(() => {
        return successfulScrobble(message);
      })
      .catch(err => {
        return unsuccessfulScrobble(message, err);
      });
  });
  
  milestone.on('callback_query', query => {
    if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
});

bot.milestone('scrobble', milestone => {
  milestone.on('callback_query', query => {
    if (query.data === 'SONG') {
      bot.editMessageText({
        text: 'Ok. In order to start searching a song click the button below. Or you can type song info in this format manually:\n\nArtist\nSong Name\nAlbum Title',
        chat_id: query.from.id,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Search...', switch_inline_query_current_chat: '' },
            { text: 'Cancel', callback_data: 'CANCEL' }
          ]]
        }
      })
      .then(() => {
        bot.setUserMilestone('search_song', query.from.id);
      });
    } else if (query.data === 'LIST') {
      bot.editMessageText({
        text: 'Ok. Send me a song list with the following syntax:\n\nArtist | Song Name | Album Title\nArtist | Song Name | Album Title\nArtist | Song Name | Album Title',
        chat_id: query.from.id,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Cancel', callback_data: 'CANCEL' }
          ]]
        }
      })
      .then(() => {
        bot.setUserMilestone('song_list', query.from.id);
      });
    } else if (query.data === 'ALBUM') {
      bot.editMessageText({
        text: 'Ok. In order to start searching an album click the button below. Or you can type album info in this format manually:\n\nArtist\nAlbum Title',
        chat_id: query.from.id,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Search...', switch_inline_query_current_chat: '' },
            { text: 'Cancel', callback_data: 'CANCEL' }
          ]]
        }
      })
      .then(() => {
        bot.setUserMilestone('search_album', query.from.id);
      });
    } else if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
});

bot.milestones.on("/scrobble", message => {
  isUserAuthorized(message.from.id, yes => {
    yes ? scrobble(message) : auth(message);
  });
});

bot.milestones.on("/help", message => {
  help(message);
});

bot.milestones.on("/auth", message => {
  auth(message);
});

bot.milestones.on("/whoami", message => {
  isUserAuthorized(message.from.id, yes => {
    yes ? whoami(message) : auth(message);
  });
});

bot.milestones.on("/wish", message => {
  isUserAuthorized(message.from.id, yes => {
    yes ? wish(message) : auth(message);
  });
});

bot.milestones.on("/report", message => {
  isUserAuthorized(message.from.id, yes => {
    yes ? report(message) : auth(message);
  });
});

bot.milestones.on('command', message => {
  message.echo('If you are confused type /help.');
});

bot.milestone('alert', milestone => {
  milestone.on('text', message => {
    alert(message);
    bot.setUserMilestone('source', message.from.id);
  });
  
  milestone.on('/cancel', message => {
    message.echo('Canceled.')
      .then(() => {
        bot.setUserMilestone('source', message.from.id);
      });
  });
  
  milestone.on('command', message => {
    alert(message);
    bot.setUserMilestone('source', message.from.id);
  });
});

function wish(message) {
  message.echo('Ok, I\'m listening... /cancel')
    .then(() => {
      bot.setUserMilestone('wish', message.from.id);
    });
}

function report(message) {
  message.echo('Ok, I\'m listening. Tell me about a bug... /cancel')
    .then(() => {
      bot.setUserMilestone('report', message.from.id);
    });
}

function help(message) {
  message.echo(`To scrobble a single song just type its info in this format:\n\nArtist\nSong Name\nAlbum Title\n\nIf you want to find a song or scrobble either a song list or an album use our guide via /scrobble command.\n\nGrant access or change account - /auth.\n\nIf you have any ideas or improvements for the bot please tell us about them via /wish command.`);
}

function auth(message) {
  return request(`${url}auth.gettoken&api_key=${api_key}&format=json`)
    .then(res => {
      let token = res.data.token;
    
      bot.sendMessage({
        text: "Please click the link below to grant access to your Last.fm account and then click OK button.",
        chat_id: message.from.id,
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [[
            {text: "Grant access...", url: `http://www.last.fm/api/auth?api_key=${api_key}&token=${token}`}, 
            {text: "OK", callback_data: "ACCESS_GRANTED"}
          ]]
        }
      });
      
      return User.findByIdAndUpdate(message.from.id, { token });
    })
    .catch(err => {
      return error(message, err);
    });
}

function scrobbleSong(event, isAlbum) {
  if (event.text) {
    let track = event.text.split("\n"),
    song = getRandomFavSong();
    
    if (track.length < 2 || track.length > 3) {
      event.echo(`Please, send me valid data separated by new lines. Example:\n\n${song.artist}\n${song.name}\n${song.album}\n\nAlbum title is an optional parameter. Type /help for more info.`);
    } else {
      User.findById(event.from.id)
        .then(user => {
          if (Date.now() - user.lastScrobble <= 30000) {
            event.echo('You can\'t scrobble songs more than once in 30 seconds. If you need to scrobble a list of songs you can do that via /scrobble command.');
            throw undefined;
          }
          
          return scrobbleSongs([{ artist: track[0], name: track[1], album: track[2] || '', duration: 0 }], user.key);
        })
        .then(res => {
          if (res.data.scrobbles['@attr'].ingored) 
            return successfulScrobble(event, 'Error. Track has been ignored.');
          
          return successfulScrobble(event);
        })
        .catch(err => {
          return unsuccessfulScrobble(event, err);
        });
    }
  } else {
    isAlbum = typeof isAlbum === 'undefined' ? true : isAlbum;
    
    User.findById(event.from.id)
      .then(user => {
        if (Date.now() - user.lastScrobble <= 30000) {
          event.echo('You can\'t scrobble songs more than once in 30 seconds. If you need to scrobble a list of songs you can do that via /scrobble command.');
          throw undefined;
        }
        
        let track = user.track;
        
        return scrobbleSongs([{ artist: track.artist, name: track.name, album: track.album, duration: 0 }], user.key);
      })
      .then(res => {
        if (res.data.scrobbles['@attr'].ingored) 
          return successfulScrobble(event, 'Error. Track has been ignored.');
        
        return successfulScrobble(event);
      })
      .catch(err => {
        return unsuccessfulScrobble(event, err);
      });
  }
}

function scrobbleSongs(tracks, key) {
  let startTimestamp = Math.floor(Date.now() / 1000) - tracks
      .map(track => track.duration)
      .reduce((prev, next) => prev + next),
    names = tracks.map(track => track.name),
    albums = tracks.map(track => track.album),
    artists = tracks.map(track => track.artist),
    timestamps = tracks.map(track => startTimestamp += track.duration),
    queryAlbums = albums.map((album, i) => `&album[${i}]=${encodeURIComponent(album)}`).sort().join(''),
    queryArtists = artists.map((artist, i) => `&artist[${i}]=${encodeURIComponent(artist)}`).sort().join(''),
    queryTimestamps = timestamps.map((ms, i) => `&timestamp[${i}]=${ms}`).sort().join(''),
    queryTracks = names.map((name, i) => `&track[${i}]=${encodeURIComponent(name)}`).sort().join(''),
    api_sig = md5(utf8(`${queryAlbums}api_key${api_key}${queryArtists}methodtrack.scrobblesk${key}${queryTimestamps}${queryTracks}${secret}`.replace(/[&=]/g, '')));
    
  return request
    .post('http://ws.audioscrobbler.com/2.0/',
      `${queryAlbums.slice(1)}&api_key=${api_key}&api_sig=${api_sig}${queryArtists}&format=json&method=track.scrobble&sk=${key}${queryTimestamps}${queryTracks}`
    );
}

function whoami(message) {
  User.findById(message.from.id)
    .then(user => {
      bot.sendMessage({
        text: `You are logged in as <a href="http://www.last.fm/user/${user.account}">${user.account}</a>.`, 
        chat_id: message.from.id,
        parse_mode: "HTML",
        disable_web_page_preview: true
      });
    });
}

function md5(string) {
  return crypto.createHash("md5").update(string, "utf8").digest("hex");
}

function getRandomFavSong() {
  let index = Math.floor(Math.random() * songs.length);
  
  return songs[index];
}

function isUserAuthorized(id, callback) {
  User.findById(id)
    .then(user => {
      user = user || {};
      callback(user.key ? true : false);
    });
}

function sendToAdmin(text) {
  return bot.sendMessage({
    chat_id: 1501719,
    text
  });
}

function alert(message) {
  User.find({})
    .then(users => {
      return bot.alert({
        chat_ids: users.map(user => user.id),
        text: message.text
      });
    })
    .then(res => {
      message.echo(res.description);
    });
}

function scrobble(message) {
  bot.sendMessage({
    text: 'What do you want to scrobble?',
    chat_id: message.from.id,
    reply_markup: {
      inline_keyboard: [[
        { text: 'Song', callback_data: 'SONG' },
        { text: 'List of Songs', callback_data: 'LIST' },
        { text: 'Album', callback_data: 'ALBUM' }
      ],
      [
        { text: 'Cancel', callback_data: 'CANCEL' }
      ]]
    }
  })
  .then(() => {
    bot.setUserMilestone('scrobble', message.from.id);
  });
}

function scrobbleAlbum(event) {
  return User.findById(event.from.id)
    .then(user => {
      let tracks = user.album.tracks.map(track => {
        return {
          name: track.name,
          artist: user.album.artist,
          album: user.album.title,
          duration: track.duration
        };
      });
      
      return scrobbleSongs(tracks, user.key);
    });
}

function successfulScrobble(event, text) {
  User.findByIdAndUpdate(event.from.id, {
    $inc: { scrobbles: 1 }, 
    username: event.from.username, 
    lastScrobble: Date.now(),
    album: {}, 
    track: {}, 
    discogsResults: []
  })
    .then(() => {
      if (event.data) {
        event.echo('Scrobbled.');
        return bot.editMessageText({
          chat_id: event.from.id,
          message_id: event.message.message_id,
          text: text ? text : 'Success!'
        });
      }
      
      return bot.sendMessage({
        chat_id: event.from.id,
        text: text ? text : 'Success!'
      });
    })
    .then(() => {
      bot.setUserMilestone('source', event.from.id);
    });
}

function unsuccessfulScrobble(event, err) {
  if (err) {
    console.log(err.data || err);
    err.data = err.data || {};
  
    if (err.data.error === 9) {
      auth(event);
    } else {
      bot.sendMessage({
        chat_id: event.from.id,
        text: 'Oops, something went wrong. Please try again later. If it goes on constantly please let us know via /report command.'
      })
      .then(() => {
        bot.setUserMilestone('source', event.from.id);
      });
    }
  }
}

function error(event, err) {
  if (err) {
    if (event.data) {
      if (err.data) {
        if (err.data.error === 14 || err.data.error === 4) {
          bot.editMessageText({
            chat_id: event.from.id,
            message_id: event.message.message_id,
            text: 'Access has not been granted.'
          })
          .then(() => {
            auth(event);
          });
          
          return;
        }
      }
      
      return event.echo('Oops, something went wrong. Please try again later.');  
    }
    
    console.log(err.data || err);
    event.echo('Oops, something went wrong. Please try again later.\nIf it goes on constantly please let us know via /report command.');
  }
}

function utf8(text) {
  return unescape(decodeURIComponent(text));
}

function nextAlbum(query, which) {
  let pages = query.message.text.slice(query.message.text.search(/\d?\d of \d\d/)).split(' of '),
      i = which === 'NEXT' ? 
        +pages[0] + 1 > +pages[1] ? 1 : +pages[0] + 1 :
        +pages[0] - 1 < 1 ? +pages[1] : +pages[0] - 1;
    
  User.findById(query.from.id, 'discogsResults')
    .then(user => {
      let id = user.discogsResults[i].id;
      
      return request(`https://api.discogs.com/releases/${id}`);
    })
    .then(res => {
      if (res.data.tracklist.length) {
        let tracks = res.data.tracklist
        .map(track => { let dur = track.duration.split(':'); return { name: track.title, duration: dur[0] * 60 + +dur[1] }});
    
        return User.findByIdAndUpdate(query.from.id, { 'album.tracks': tracks }, { new: true });
      }
      
      return User.findByIdAndUpdate(query.from.id, { 'album.tracks': ['No tracks on this result'] }, { new: true });
    })
    .then(user => {
      let title = user.album.title,
        artist = user.album.artist;
      
      return bot.editMessageText({
        chat_id: query.from.id,
        message_id: query.message.message_id,
        text: `You are about to scrobble [${title}](${encodeURI(`http://www.last.fm/music/${artist}/${title}`)}) by [${artist}](${encodeURI(`http://www.last.fm/music/${artist}`)}). The following tracks have been found on Discogs.com and will be scrobbled:\n\n${user.album.tracks.map(track => track.name).join('\n')}\n\nResults: ${i} of ${user.discogsResults.length - 1}`,
        disable_web_page_preview: true,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Edit', callback_data: 'EDIT' },
              { text: '⬅️', callback_data: 'PREV' },
              { text: '➡️', callback_data: 'NEXT' },
              { text: 'Cancel', callback_data: 'CANCEL' }  
            ],
            [
              { text: 'OK', callback_data: 'OK' }
            ]
          ]
        }
      });
    })
    .catch(err => {
      error(query, err);
    });
}

function cancelQuery(query) {
  bot.editMessageText({
    chat_id: query.from.id,
    message_id: query.message.message_id,
    text: 'Canceled.'
  })
  .then(() => {
    bot.setUserMilestone('source', query.from.id);
  });
}

module.exports.bot = bot;