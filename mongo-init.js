db.createUser(
  {
    user: 'scrobblerbot_dev',
    pwd: 'scrobblerbot_dev',
    roles: [
      {
        role: 'readWrite',
        db: 'scrobblerbot_dev'
      }
    ]
  }
);