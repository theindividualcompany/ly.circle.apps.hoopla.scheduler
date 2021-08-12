- [Open Source Software](#open-source-software)
- [Objects & Schemas](#objects--schemas)
  - [Job](#job)
  - [Tweet](#tweet)

# Open Source Software

| Name | Description                           | Url                           |
| ---- | ------------------------------------- | ----------------------------- |
| arg  | Node.js Command Line Argument Parsing | https://github.com/vercel/arg |

# Objects & Schemas

## Job

| Name               | Type         | Description |
| ------------------ | ------------ | ----------- |
| id                 | Int          | $           |
| created_at         | Date         | (           |
| updated_at         | Date         | ^           |
| active             | Boolean      | fds         |
| interval           | Cron?        | ^           |
| last_start_time    | Date         | ^           |
| last_complete_time | Date         | 45          |
| users              | String (csv) | ^           |
| filters            | String (csv) | ^           |

## Tweet

| Name       | Type        | Description                 |
| ---------- | ----------- | --------------------------- |
| id         | Int         | $                           |
| job_id     | Int         | (                           |
| created_at | Date        | ^                           |
| updated_at | Date        | ^                           |
| matching   | String(csv) | Filters that matched search |
| user       | String      | User Handle of Tweet        |
| tweet      | String      | Content of Tweet            |

## Job Processor Docs

### Input
```javascript
    let params = {
        user_accounts:[...String],
        filters:[...String],
        lookback: Integer
    }
```
A job requires the basic input of

| Name       | Type        | Description                 |
| ---------- | ----------- | --------------------------- |
| user_accounts         | Array of Strings         | All target Twitter accounts to scan                           |
| filters         | Array of Strings         | All Strings to search for within a tweet, if any string within the array is found in a tweet then that tweet is considered a match. A empty array is equivalent to search for an empty string. I.E. No filters mean all tweets are matches. |
| lookback         | Integer         | Number of tweets to scan. Note that twitter through it's api can not send you replies and retweets, however, they are still counted. So a request for 200 tweets, can result in much less tweets if those types of tweets are ignored. So an account that is prolific in replying or retweeting may need a much higher number.                           |

#### Command Line Example
`node twitter_processor.js scan --user_accounts "binance,kucointypo,BittrexExchange,CoinMetro,krakenfx,coinbase" --filters "Bitcoin,BTC" --lookback 10`

### Processed Job Object 
```json
{
  "job": {
    "users":[...String],
    "filters": [...String],
    "timestamp": Date.now(),
    "lookback": Integer
  },
  "tweets": {
    "result_tweets":[
        {...UserTimelineLookupObject},
    ],
    "filter_matches":[
        {...TwitterAPITweetObject}
    ],
    "total_filter_matches": Integer,
    "total_tweets_scanned": Integer,
    "user_had_error": Boolean  
   },
  "num_timeline_requests": Integer
}
```


| Name       | Type        | Description                 |
| ---------- | ----------- | --------------------------- |
| job | Object | Job Input data |
| job.users | Array of Strings | All user accounts scanned in this job |
| job.filters | Array of Strings | All filters utilized in this job. An empty array is equal to an array with one empty string. |
| job.timestamp | Timestamp | Date.now() |
| job.lookback | Integer | How many tweets requested for each user from Twitter API. |
| tweets | Object | Job Scan Results Data |
| tweets.result_tweets | Array of Objects | This is an array of object results from each getUserTimelineTweets look up done for each user. |
| tweets.filter_matches | Array Of Objects | This is an array of Twitter API Tweet objects |
| tweets.total_filter_matches | Integer | Count of how many total tweets matched the inputted filters |
| tweets.total_tweets_scanned | Integer | Count of the total tweets scanned |
| tweets.user_had_error | Boolean | Flag, if true it means one UserTimelineLookupObject located in tweets.result_tweets had an error |
| num_timeline_requests | Integer | Count of how many requests to the Twitter user_timeline API have been made |

### UserTimelineLookupObject
#### Example UserTimelineLookupObject With Error (Looking up a user that does not exist)
```javascript
{
        "results": [],
        "errorFound": true,
        "errors": [
          {
            "errorMessage": "API ERROR FOR GATEWAY: https://api.twitter.com/1.1/statuses/user_timeline.json CODE:34 MESSAGE: Sorry, that page does not exist.",
            "errorEndpoint": "https://api.twitter.com/1.1/statuses/user_timeline.json",
            "errorParams": {
              "count": 3,
              "trim_user": true,
              "include_rts": false,
              "exclude_replies": true,
              "screen_name": "kucointypo",
              "cursor": 0,
              "stringify_ids": true
            },
            "givenError": [
              {
                "code": 34,
                "message": "Sorry, that page does not exist."
              }
            ]
          },
          {
            "errorFound": true,
            "errorMessage": "UNDEFINED RESULTS FOR TIMELINE TWEETS. Gracefully aborting scan..."
          }
        ],
        "numRequests": 1,
        "extraParams": {
          "trim_user": true,
          "include_rts": false,
          "exclude_replies": true,
          "screen_name": "kucointypo"
        },
        "numTweets": 0,
        "clean_matches": [],
        "num_clean_matches": 0
},
```
#### Example UserTimelineLookupObject Without Error
```javascript

{
  "results": [
    {...TwitterAPITweetObject}
  ],
  "errorFound": false,
  "errors": [],
  "numRequests": 1,
  "extraParams": {
    "trim_user": true,
    "include_rts": false,
    "exclude_replies": true,
    "screen_name": "binance"
  },
  "numTweets": 1,
  "clean_matches": [],
  "num_clean_matches": 0
}



```
| Name       | Type        | Description                 |
| ---------- | ----------- | --------------------------- |
| results | Array of Objects | All Twitter API Tweet objects returned from the request |
| errorFound | Boolean | Flag, if an error occured during the request or scanning it will be true. |
| errors | Array of Objects | Array of error message objects. Object can have debugging parameters, but will always have a message. |
| numRequests | Integer | Count requests that have been made to the Twitter API during the Timeline look up |
| extraParams | Object | Contains params utilized in the direct lookup request for the Twitter API |
| extraParams.trim_user | Boolean | Should Twitter API trim detailed user info in each Tweet result object |
| extraParams.include_rts | Boolean | Should Twitter API include retweets in it's results |
| extraParams.exclude_replies | Boolean | Should Twitter API exclude replies from it's results |
| extraParams.screen_name | String | username to request timeline tweets from. |
| numTweets | Integer | Number of tweets found from the User Timeline Lookups |
| clean_matches | Array of Objects | A array of Twitter API tweet objects where the text of the tweet satisfies at least one filter  |
| num_clean_matches | Integer | Number of tweets that matched the filter |

### Example TwitterAPITweetObject
```javascript
{
  "created_at": "Tue Feb 16 21:59:49 +0000 2021",
  "id": 1361797457978548200,
  "id_str": "1361797457978548225",
  "text": "#Bitcoin broke the $50,000 mark and set a new all-time high, while some of Wall Street’s oldest banks warmed to cry… https://t.co/hq6igOGYe9",
  "truncated": true,
  "entities": {
    "hashtags": [
      {
        "text": "Bitcoin",
        "indices": [
          0,
          8
        ]
      }
    ],
    "symbols": [],
    "user_mentions": [],
    "urls": [
      {
        "url": "https://t.co/hq6igOGYe9",
        "expanded_url": "https://twitter.com/i/web/status/1361797457978548225",
        "display_url": "twitter.com/i/web/status/1…",
        "indices": [
          117,
          140
        ]
      }
    ]
  },
  "source": "<a href=\"https://sproutsocial.com\" rel=\"nofollow\">Sprout Social</a>",
  "in_reply_to_status_id": null,
  "in_reply_to_status_id_str": null,
  "in_reply_to_user_id": null,
  "in_reply_to_user_id_str": null,
  "in_reply_to_screen_name": null,
  "user": {
    "id": 574032254,
    "id_str": "574032254"
  },
  "geo": null,
  "coordinates": null,
  "place": null,
  "contributors": null,
  "is_quote_status": false,
  "retweet_count": 156,
  "favorite_count": 878,
  "favorited": false,
  "retweeted": false,
  "possibly_sensitive": false,
  "lang": "en",
  "filter_match": [
    "Bitcoin"
  ],
  "filter_miss": [
    "BTC"
  ]
}


```
### Appended Twitter API Variables
**filter_match** and **filter_miss** are appended to the TwitterAPITweetObject during the job processing. 

| Name       | Type        | Description                 |
| ---------- | ----------- | --------------------------- |
| filter_match | Array of Strings | Array of strings for which the tweet text was a match |
| filter_miss | Array of Strings | Array of strings for which the tweet did not contain |






## Twitter API Reference
####GET statuses/user_timeline  
https://developer.twitter.com/en/docs/tweets/timelines/api-reference/get-statuses-user_timeline  
Requests / 15-min window (user auth)	900  
Requests / 15-min window (app auth)	1500  
Requests / 24-hour window	100,000  
MAX 200 Count results
