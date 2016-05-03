'use strict';

var debug = require('debug')('flint');
var validator = require('validator');
var moment = require('moment');
var Twitter = require('../libs/twitter');

module.exports = function(flint) {

  flint.on('spawn', function(bot) {
    debug('new bot spawned in room: %s', bot.myroom.title);
  });
  
  flint.on('despawn', function(bot) {
    debug('bot despawned in room: %s', bot.myroom.title);
  });
  
  flint.on('message', function(message, bot) {
    // debug('"%s" said "%s" in room "%s"', message.personEmail, message.text, bot.myroom.title);
  });
  
  flint.on('file', function(file, bot) {
    // debug('recieved file "%s"', file.name);
  });
  
  flint.on('error', function(err) {
    debug(err);
  });
  
  // /track <hashtag>
  flint.hears('/track', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);

    var hashtag = trigger.args.length > 0 ? trigger.args.shift() : false;

    bot.twitter.track(hashtag);
  });

  // /start <message>
  flint.hears('/start', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);
    
    if(trigger.args.length > 0) {
      var message = trigger.message.text.split(' ');
      var cmd = message.length > 0 ? message.shift() : null;
      message = message.length > 0 ? message.join(' ') : false;
    } else {
      var message = false;
    }
    
    bot.twitter.start(message);
  });

  // /restart
  flint.hears('/restart', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);

    bot.twitter.restart();
  });

  // /stream <on/off>
  flint.hears('/stream', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);
    
    bot.twitter.toggleStream();
  });

  // /winner <#> <message>
  flint.hears('/winner', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);
    
    if(trigger.args.length > 0) {
      var message = trigger.message.text.split(' ');
      var cmd = message.length > 0 ? message.shift() : null;
      var count = message.length > 0 ? message.shift() : 1;
      message = message.length > 0 ? message.join(' ') : false;
    } else {
      var count = 1;
      var message = false;
    }

    bot.twitter.winner(count, message);
  });

  // /stop <message>
  flint.hears('/stop', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);
    
    if(trigger.args.length > 0) {
      var message = trigger.message.text.split(' ');
      var cmd = message.length > 0 ? message.shift() : null;
      message = message.length > 0 ? message.join(' ') : false;
    } else {
      var message = false;
    }

    bot.twitter.stop(message);
  });

  // /stats
  flint.hears('/stats', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);
    
    bot.twitter.stats();
  });

  // /help
  flint.hears('/help', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);

    bot.twitter.help();
  });

  // /dm
  flint.hears('/dm', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);

    if(trigger.args.length > 2) {
      var args = trigger.message.text.split(' ');
      var cmd = args.shift();
      var screen_name = args.shift();
      var message = args.join(' ');

      bot.twitter.sendDM(screen_name, message);
    }
  });

  // /tweet
  flint.hears('/tweet', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);

    if(trigger.args.length > 1) {
      var args = trigger.message.text.split(' ');
      var cmd = args.shift();
      var message = args.join(' ');

      bot.twitter.sendUpdate(message);
    }
  });

  // /dump
  flint.hears('/dump', function(bot, trigger) {
    if(!bot.twitter) bot.twitter = new Twitter(bot);

    bot.twitter.dbDump();
    var dump = [];
      _.forEach(rows, row => {
        dump.push(util.format('"%s","%s",', row.screen_name, row.text.replace(/[\n\r]+/g, ' ')));
      });
      this.bot.say('%s', dump.join('\n'));

      
  });

};