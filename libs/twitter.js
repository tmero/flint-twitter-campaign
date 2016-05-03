'use strict';

var EventEmitter = require('events').EventEmitter;
var TwitterAPI = require('twitter');
var sqlite3 = require('sqlite3').verbose();
var moment = require('moment');
var debug = require('debug')('tweets');
var when = require('when');
var util = require('util');
var fs = require('fs');

var _ = require('lodash');

var twitterOptions = {
  handle: '<twitter screen_anme without the @>',
  consumer_key: '<token>',
  consumer_secret: '<token>',
  access_token_key: '<token>',
  access_token_secret: '<token>'
};

function Twitter(bot) {
  EventEmitter.call(this);

  this.bot = bot;

  this.client = new TwitterAPI(twitterOptions);

  this.db = new sqlite3.Database(twitterOptions.handle + '_' + this.bot.myroom.id + '.db', err => {
    if(err) {
      debug(err);
      throw new Error('could not open/create database');
    }
  });

  this.tag = ''; // tag being tracked
  this.started = false; // campaign started?
  this.showStream = true; // display stream?
  this.followersAtStart = 0;
  this.campaignStart = moment();
  this.campaignStop = moment();
  
  this.stream = false; // stream object
  
  this.dbInit()
    .then(() => this.getConfig('tag').then(r => this.tag = r))
    .then(() => this.getConfig('started').then(r => this.started = r))
    .then(() => this.getConfig('showStream').then(r => this.showStream = r))
    .then(() => this.getConfig('followersAtStart').then(r => this.followersAtStart = r))
    .then(() => this.getConfig('campaignStart').then(r => this.campaignStart = r))
    .then(() => this.getConfig('campaignStop').then(r => this.campaignStop = r))
    .then(() => {
      if(this.tag !== '') {
        return this.track(this.tag);
      }
    })
    .catch(err => debug(err));
}
util.inherits(Twitter, EventEmitter);

Twitter.prototype.dbInit = function() {
  var tweets = 'CREATE TABLE tweets ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "tag" VARCHAR(255), "twitter_id" INTEGER, "screen_name" VARCHAR(255), "text" VARCHAR(255), "timestamp" DATE)';
  var config = 'CREATE TABLE config ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "tag" VARCHAR(255), "started" BOOLEAN, "showStream" BOOLEAN, "followersAtStart" INTEGER, "campaignStart" DATE, "campaignStop" DATE)';
  var configAdd = 'INSERT INTO config (tag, started, showStream, followersAtStart, campaignStart, campaignStop) VALUES($tag, $started, $showStream, $followersAtStart, $campaignStart, $campaignStop)';

  var testExists = (table) => {
    var exists = when.promise((resolve, reject) => {
      var sqlTest = 'SELECT name FROM sqlite_master WHERE type="table" AND name="' + table + '"';
      this.db.get(sqlTest, (err, row) => {
        if(err) {
          reject(err);
        } 
        if(row) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
    return exists;
  };

  var createDb = (sql) => {
    var created = when.promise((resolve, reject) => {
      this.db.run(sql, err => {
        if(err) {
          reject(err);
        } else {
          resolve(true);
        } 
      });
    });
    return created;
  };

  var loadConfig = () => {
    var loaded = when.promise((resolve, reject) => {
      this.db.run(configAdd, {
        $started: false, 
        $showStream: true, 
        $followersAtStart: 0,
        $campaignStart: moment().toDate(), 
        $campaignStop: moment().toDate()
      }, err => {
        if(err) {
          return reject(err);
        } else {
          return resolve(true);
        }
      });
    });
    return loaded;
  };

  var testTweets = testExists('tweets')
    .then(exists => {
      if(!exists) {
        return createDb(tweets);
      } else {
        return true;
      }  
    });

  var testConfig = testExists('config')
    .then(exists => {
      if(!exists) {
        return createDb(config).then(() => loadConfig());
      } else {
        return true;
      }  
    });

  return when.all([testTweets, testConfig]);
};

Twitter.prototype.dbReset = function() {
  var drop = 'DROP TABLE tweets';
  var tweets = 'CREATE TABLE tweets ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "tag" VARCHAR(255), "twitter_id" INTEGER, "screen_name" VARCHAR(255), "text" VARCHAR(255), "timestamp" DATE)';

  var result = when.promise((resolve, reject) => {

    this.db.serialize(() => {
      this.db.run(drop);
      this.db.run(tweets, err => {
        if(err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });

  });
  return result;
};

Twitter.prototype.dbDump = function() {
  var sql = 'SELECT screen_name,text FROM tweets';

  this.db.all(sql, (err, rows) => {
    if(err) {
      debug(err);
    } else {
      
    }
  });

};

Twitter.prototype.dbInsert = function(object) {
  var sql = 'INSERT INTO tweets (tag, twitter_id, screen_name, text, timestamp) VALUES($tag, $twitter_id, $screen_name, $text, $timestamp)';

  this.db.run(sql, {
    $tag: object.tag,
    $twitter_id: object.twitter_id,
    $screen_name: object.screen_name,
    $text: object.text,
    $timestamp: moment().toDate()
  }, err => {
    if(err) {
      debug(err);
    } else {
      debug('user "@%s" tweeted with tag "%s": %s', object.screen_name, object.tag, object.text);
    }
  });
};

Twitter.prototype.getConfig = function(setting) {
  var sql = 'SELECT * FROM config';

  var value = when.promise((resolve, reject) => {
    this.db.get(sql, (err, row) => {
      if(err) {
        reject(err);
      } else {
        if(row[setting]) {
          resolve(row[setting]);
        } else {
          resolve('');
        }
      }
    });
  });
  return value;
};

Twitter.prototype.setConfig = function(setting, value) {
  var sql = 'UPDATE config SET ' + setting + ' = $setting WHERE id = 1';

  var results = when.promise((resolve, reject) => {
    this.db.run(sql, { $setting: value }, err => {
      if(err) {
        debug(err);
        this[setting] = value;
        resolve(false);
      } else {
        this[setting] = value;
        resolve(true);
      }
    });
  });
  return results;
};

Twitter.prototype.getTagged = function(tag) {
  var results = when.promise((resolve, reject) => {
    var sql = 'SELECT * FROM tweets WHERE tag = $tag';

    this.db.all(sql, {
      $tag: tag
    }, (err, rows) => {
      if(err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
  return results;
};

Twitter.prototype.sendDM = function(screen_name, text) {
  this.client.post('direct_messages/new', {
    screen_name: screen_name, 
    text: text
  }, (error, tweet, response) => {
    if(error) debug(error);
    this.bot.say('Sent a Direct Message to @%s: %s', screen_name, text);
  });
};

Twitter.prototype.sendUpdate = function(text) {
  this.client.post('statuses/update', {
    status: text
  }, (error, tweet, response) => {
    if(error) {
      debug(error);
    } else {
      this.bot.say('Tweet sent: %s', text);
    }
  });
};

Twitter.prototype.getFollowerCount = function() {
  var results = when.promise((resolve, reject) => {
    this.client.get('users/show', { screen_name: twitterOptions.handle }, (error, user, response) => {
      if(error) {
        debug(error);
        resolve(0);
      } else {
        resolve(user.followers_count);
      }
    });
  });
  return results;
};

Twitter.prototype.getFollowerIds = function() {
  var results = when.promise((resolve, reject) => {
    this.client.get('followers/ids', (error, user, response) => {
      if(error) {
        debug(error);
        resolve([]);
      } else {
        resolve(user.ids);
      }
    });
  });
  return results;
};

Twitter.prototype.getIdByScreenName = function(screen_name) {
  var results = when.promise((resolve, reject) => {
    this.client.get('users/show', { screen_name: screen_name }, (error, user, response) => {
      if(error) {
        debug(error);
        resolve('');
      } else {
        resolve(user.id);
      }
    });
  });
  return results;
};

Twitter.prototype.getScreenNameById = function(id) {
  var results = when.promise((resolve, reject) => {
    this.client.get('users/show', { user_id: id }, (error, user, response) => {
      if(error) {
        debug(error);
        resolve('');
      } else {
        resolve(user.screen_name);
      }
    });
  });
  return results;
};

Twitter.prototype.track = function(tag) {
  debug('tracking tag: %s', tag);

  var processTweet = tweet => {
    var thisTweet = {
      tag: this.tag,
      screen_name: tweet.user.screen_name, 
      text: tweet.text
    };

    // get id and write to db
    this.getIdByScreenName(tweet.user.screen_name)
      .then(id => {
        thisTweet.twitter_id = id;
        return when.resolve(true);
      })
      .then(() => this.dbInsert(thisTweet))
      .catch(err => debug(err));
    
    if(this.showStream) {
      this.bot.say('Tweet by @%s: %s', tweet.user.screen_name, tweet.text);
    }
  };
  
  var processError = error => {
    debug(error);
  };

  var streamTweet = stream => {
    if(this.stream) {
      debug('removing previous tracking listeners');
      this.stream.destroy();
    }

    this.stream = stream;
    
    this.stream.on('data', processTweet);
    this.stream.on('error', processError);
  };

  this.setConfig('tag', tag).then(() => {
    this.bot.say('Enabled tracking for: %s', this.tag);
    this.client.stream('statuses/filter', {track: this.tag}, stream => streamTweet(stream));
  });

  
};

Twitter.prototype.start = function(message) {
  if(this.tag) {
    this.dbReset().then(() => {
      return this.setConfig('started', true)
        .then(() => this.setConfig('campaignStart', moment().toDate()))
        .then(() => {
          if(message) {
            // insert tag at end of message
            message = message + ' ' + this.tag;

            // send status update
            this.sendUpdate(message);

            debug('starting campaign with message: %s', message);
          } else {
            debug('starting campaign');
          }
          this.bot.say('Started Twitter campaign.');

          // get number of followers
          return this.getFollowerCount().then(count => this.setConfig('followersAtStart', count));
        });
    })
    .catch(err => debug(err));

  } else {
    this.bot.say('Please specify a tag to track first with /track <tag>\n\n');
    this.help();
  }
};

Twitter.prototype.restart = function() {};

Twitter.prototype.toggleStream = function() {
  this.setConfig('showStream', !this.showStream)
    .then(() => {
      var state = this.showStream ? 'on' : 'off';

      // notify room of streaming status
      this.bot.say('Streaming is now set %s', state);
    });
};

Twitter.prototype.winner = function(count, message) {
  // get rand between 0 and max
  function getRand(max) {
    return Math.floor(Math.random() * max);
  }

  this.getTagged(this.tag)
    .then(users => _.map(users, 'twitter_id'))
    .then(idsThatTweeted => this.getFollowerIds()
        .then(idsThatFollow => _.intersection(idsThatTweeted, idsThatFollow)))
    .then(potentialWinners => _.uniq(potentialWinners))
    .then(potentialWinners => this.getIdByScreenName(twitterOptions.handle)
        .then(id => _.difference(potentialWinners, [ id ])))
    .then(potentialWinners => {
      if(potentialWinners.length > 0) {
        // determine winner(s) at random and send a dm to each winner
        for (var i = 0; i < count; i++) {
          //get random winner
          var id = potentialWinners[getRand(potentialWinners.length)];
          // remove winner from potential winners (no doubles)
          potentialWinners = _.difference(potentialWinners, [id]);
          debug('id: %s',id);
          this.getScreenNameById(id).then(screen_name => {
            // announce winner to room
            this.bot.say('Winner: @%s', screen_name);
            // send twitter dm to winner if message is specified
            if(message) this.sendDM(screen_name, message);
          });
          
        }
      } else {
        this.bot.say('There are no winners that qualify');
      }
      
    })
    .catch(err => debug(err));
};

Twitter.prototype.stop = function(message) {
  if(message) {
    message = message + ' ' + this.tag;
    this.sendUpdate(message);
  }

  this.bot.say('Stopped Twitter campaign.');

  this.stats();

  if(this.stream) this.stream.destroy();
  this.stream = false;

  this.setConfig('started', false).catch(err => debug(err));
  this.setConfig('campaignStop', moment().toDate()).catch(err => debug(err));
  this.setConfig('showStream', false).catch(err => debug(err));
};

Twitter.prototype.stats = function() {
  var tweets = 0;
  var followers = 0;

  this.getTagged(this.tag)
    .then(users => {
      tweets = users.length;
      return true;
    })
    .then(() => this.getFollowerCount())
    .then(count => {
      followers = count - this.followersAtStart;
      return when.resolve(true);
    })
    .then(() => {
      this.bot.say('\n' +
        'Twitter Campaign Stats:\n' +
        '=======================\n' +
        'Total "%s" tweets: %s\n' + 
        'New followers: %s\n' +
        '\n\n', this.tag, tweets, followers);
    })
    .catch(err => debug(err));
};

Twitter.prototype.help = function() {
  // help
  this.bot.say('\n' +
    'Twitter Campaign Bot:\n' +
    '=====================\n' +
    '/track <tag> - Define word to track\n' +
    '/start [message] - Start campaign with optional message\n' +
    '/restart - Restart tracking/campaign with previous settings\n' +
    '/stream - Toggle in-room streaming of tracked tweets\n' + 
    '/winner [#] [message] - Select # of winners and message to DM\n' +
    '/stop [message] - End campaign with optional message\n' + 
    '/stats - Show campaign stats\n' +
    '/help - This message\n' +
    '\n\n' +
    'Notes:\n' +
    '======\n' +
    '1) "/start" will automatically append tracked tag to status update if message is supplied\n' +
    '2) "/restart" will not send status update nor affect stats\n' +
    '3) "/winner" will default to 1 if not specified\n' +
    '\n\n');

};
module.exports = Twitter;