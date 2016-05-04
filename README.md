# Run a Twitter Campaign from Cisco Spark
#### Powered by [Flint](https://github.com/nmarus/flint)

```
Twitter Campaign Bot:
=====================
/track <tag> - Define word to track
/start [message] - Start campaign with optional message
/restart - Restart tracking/campaign with previous settings
/stream - Toggle in-room streaming of tracked tweets
/winner [#] [message] - Select # of winners and send DM to each winner
/stop [message] - End campaign with optional message
/stats - Show campaign stats
/help - This message

Notes:
======
1) "/restart" will not send status update nor affect stats
2) "/winner" will default to 1 if not specified
```

#### Setup

1. Create a Twitter API app
2. Edit Twitter settings in /lib/twitter.js
3. Edit Flint settings in /config/flint.conf.js

#### Usage

1. Track a key word/prase/hashtag.

    `/track #flint`

2. Start you campaign with an optional message.

    `/start Retweet #flint and follow @flint for a chance to win nothing!`

3. Toggle on/off the feed of tracked tweets to room.

    `/stream`

4. At the end of campaign... stop the tracking.

    `/stop`

5. Determine winners. Number specified determines number of winners that are randomly chosen and send them a direct message in Twitter. 

    `/winner 2 You have won! Congradulations for playing!`

6. Show stats of campaign while it is in progress.

    `/stats`

###### Output:
```
Twitter Campaign Stats:
=======================
Total "#flint" tweets: 27
New followers: 424
```

#### Other Commands:

`/tweet <message>` : Posts a status update to Twitter

`/dm <screen_name> <message>` : Sends a Twitter DM to a user

`/dump` : Dumps tweets table to Spark. Includes Screen name and the text of the tweet that matches the tracking keyword. 

`/restart` : Restarts campaign with setup found in database in the event the application is restarted.