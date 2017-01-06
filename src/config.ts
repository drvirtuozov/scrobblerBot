export default {
	token: process.env.SCROBBLER,
	lastfm: {
		url: 'http://ws.audioscrobbler.com/2.0/?method=',
		key: process.env.SCROBBLER_API_KEY,
		secret: process.env.SCROBBLER_SECRET
	},
	discogs: {
		key: process.env.SCROBBLER_DISCOGS_KEY,
		secret: process.env.SCROBBLER_DISCOGS_SECRET,
	}
};