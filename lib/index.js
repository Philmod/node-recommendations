/*!
 * node-recommendations
 * Copyright(c) 2012 Philmod <philippe.modard@gmail.com>
 * MIT Licensed
 */


/**
 * Module dependencies.
 */

var _      = require('underscore')
  , uuid   = require('uuid')
  , redis  = require('redis')
  , util   = require('util')
  , crypto = require('crypto')
  , async  = require('async')
  , correlation = require('./correlation.js')
  ;


/**
 * Library version.
 */

var version = '0.0.2';


/**
 * Expose recommendations.
 */
module.exports = {
  version: version,
  create: function(name,options) {
    if (!name) throw new Error('recommendations.create() requires a redis key (name) for namespacing');
    options = options || {};
    return new Recommendations(name, options);
  }
};


/**
 * Recommendations object.
 */
var Recommendations = function(name,options) {
    this.name     = name
  , this.options  = options
  , this.usersKey = this.name + ':users:'
  , this.itemsKey = this.name + ':items:'
  , this.itemsimKey = this.name + ':itemsim:'
  , this.n        = 0
  , this.client   = null
  ;
  this.connect();
  return this;
}
/**
 * Create a redis client, override to
 * provide your own behaviour.
 */
Recommendations.prototype.connect = function() {
  this.client = this.options.redisClient || (redis.createClient());
}
Recommendations.prototype.addPeople = function(name,id) {
  var p = new Person(name,this,id);
  return p;
}
Recommendations.prototype.getPeopleByName = function(name,callback) {
  var p = new Person(name,this);
  p.getByName(callback);
}
Recommendations.prototype.getUsers = function(callback) {
  this.client.keys(this.usersKey+'*', callback);
}
Recommendations.prototype.getCriticsuser = function(pName, callback) {
  var criticsUser
    , args = [this.usersKey+pName,'inf',0,'WITHSCORES'];
  this.client.zrevrangebyscore(args,function(err,items) {
    if (err) return callback(err);
    var out = {}
      , j, max2;
    for (j=0,max2=items.length; j<max2; j+=2) {
      out[items[j]] = parseFloat(items[j+1]);
    }
    callback(null,out);
  });
}
Recommendations.prototype.getCriticsusers = function(callback) {
  var that = this
    , criticsUsers = [];
  this.getUsers(function(err,users) {
    if (err) return callback(err);
    var nb = users.length;
    that.n = nb;
    var i, max;
    for (i=0,max=users.length; i<max; i++) {
      (function(i){
        that.getCriticsuser(users[i].substr(that.usersKey.length), function(err,criticsUser){
          if (err) return callback(err);
          criticsUsers[users[i]] = criticsUser;
          if (--nb == 0) callback(null,criticsUsers);
        });
      })(i);
    }
  });
}
Recommendations.prototype.pushItemsim = function(itemsim, callback) { // push into Redis
  var cmds = []
    , i, j;
  for (i in itemsim) {
    for (j in itemsim[i]) {
      cmds.push(['zadd', this.itemsimKey+i, itemsim[i][j][0], itemsim[i][j][1]]);
    }
  }
  this.client.multi(cmds).exec(function(err,res) {
    callback(err,itemsim);
  });
}
Recommendations.prototype.getItemsim = function(item, callback) {
  var itemsim
    , args = [this.itemsimKey+item,'inf',0,'WITHSCORES'];
  this.client.zrevrangebyscore(args,function(err,items) {
    if (err) return callback(err);
    var out = {}
      , j, max2;
    for (j=0,max2=items.length; j<max2; j+=2) {
      out[items[j]] = parseFloat(items[j+1]);
    }
    callback(null,out);
  });
}
Recommendations.prototype.calculateItemsim = function(callback) {
  var that = this;
  this.getCriticsusers(function(err,criticsUser) {
    if (err) return callback(err);
    var itemsim = calculateSimilarItems(criticsUser,that.n);
    that.pushItemsim(itemsim,callback);
  });
}
var calculateSimilarItems = function(prefs,n) {
  // Create a dictionary of items showing which other items they are most similar to.
  var result={};
  // Invert the preference matrix to be item-centric
  var itemPrefs = transformPrefs(prefs)
    , tailleS   = Object.keys(itemPrefs).length
    , c = 0
    , scr, item
    ;
  for (item in itemPrefs) {
    // Status updates for large datasets
    c+=1;
    if (c%100==0) {
      console.log(c + ' ' + tailleS);
    }
    // Find the most similar items to this one
    scr = topMatches(itemPrefs,item, n || 10, this.correlation);
    result[item] = scr;
  }
  return result
}
Recommendations.prototype.getRecommendedItems = function(pName,callback) {
  var that = this;
  var scores={}
    , totalSim={};
  that.getCriticsuser(pName, function(err,userRatings) {
    if (err) return callback(err);
    var userRatingsArray = []
      , i;
    for (i in userRatings) userRatingsArray.push([i,userRatings[i]]);

    function calculate(rating, cb) {
      that.getItemsim(rating[0],function(err,itemMatch) {
        if (err) return cb(err);
        var item2, similarity, item3;
        for (item2 in itemMatch) {
          similarity = itemMatch[item2];
          item3 = item2;
          // Ignore if this user has already rated this item
          if (item3 in userRatings) { continue }
          // Weighted sum of rating times similarity
          if (!scores[item3]) { scores[item3] = 0 }  //scores.setdefault(item2,0)
          scores[item3]+=similarity*rating[1];
          // Sum of all the similarities
          if (!totalSim[item3]) { totalSim[item3] = 0 }  //totalSim.setdefault(item2,0)
          totalSim[item3]+=similarity;
        }
        cb();
      });
    }

    async.forEach(userRatingsArray, calculate, function(err){
      if (err) return callback(err);
      var rankings = []
        , i=0
        , item, score;
      for (item in scores) {
        score = scores[item]/totalSim[item];
        if (!isNaN(score)) {
          rankings[i] = [ score, item ];
          i+=1;
        }
      }
      // Return the rankings from highest to lowest
      rankings.sort(function(a,b){ return a[0]-b[0]; })
      rankings.reverse()
      var out = {}
        , i, max;
      for (i=0, max=rankings.length; i<max; i++) {
        out[rankings[i][1]] = rankings[i][0];
      }
      callback(null,out);
    });

  });
}


/**
 * Person object.
 *
 * @param {String} name
 * @param {String} id   [optional]
 * @return {Object}
 * @api public
 */
var Person = function(name,recommendations,id) {
    this.id    = id || uuid.v1()
  , this.name  = name || null
  , this.items = []
  , this.recommendations = recommendations
  , this.key   = this.recommendations.usersKey + this.name
  ;
  return this;
}
Person.prototype.addItem = function(name,score,id,noSave) {
  this.items.push(new Item(name,score,this,id,noSave));
}
Person.prototype.getRecommendedItems = function(callback) {
  return this.recommendations.getRecommendedItems(this.name,callback);
}
Person.prototype.getByName = function(callback) {
  var that = this;
  var args = [this.key,'inf',0,'WITHSCORES'];
  this.recommendations.client.zrevrangebyscore(args,function(err,res) {
    if (err) return callback(err);
    for (var i=0, max=res.length; i<max; i+=2) {
      that.addItem(res[i],res[i+1],null,true);
    }
    callback(null,that);
  });
}

/**
 * Item object.
 *
 * @param {String} name
 * @param {Float}  score
 * @param {String} id    [optional]
 * @api private
 */
var Item = function(name,score,person,id,noSave) {
    this.id     = id || uuid.v1()
  , this.name   = name || null
  , this.score  = parseFloat(score) || null
  , this.person = person
  , this.db     = this.person.recommendations.client
  , this.key    = this.person.recommendations.itemsKey + this.name
  ;
  if (typeof noSave == 'undefined' || !noSave) {
    this.addRedis(function(err,res) {
      if (err) console.error('REDIS add item : ' + err);
    });
  }
}
Item.prototype.addRedis = function(callback) {
  var cmds = [];
  cmds.push(['zadd', this.person.key, this.score, this.name]);
  cmds.push(['zadd', this.key, this.score, this.person.name]);
  this.db.multi(cmds).exec(callback);
}


/**
 * Similarity.
 *
 */
function sim(prefs,p1,p2,type) {
  if (type == 'distance') return correlation.sim_distance(prefs,p1,p2);
  else if (type == 'pearson') return correlation.sim_pearson(prefs,p1,p2);
  else return correlation.sim_distance(prefs,p1,p2); // default
}

/**
 * topMatches.
 *
 * Returns the best matches for person from the prefs dictionary.
 * Number of results and similarity function are optional params.
 *
 */
function topMatches(prefs,person,n,correlation) {
  var i=0;
  var scores = []
    , other;
  for (other in prefs) {
    if (other!=person) {
      scores[i] = [ sim(prefs, person, other, correlation), other ];
      i+=1;
    }
  }
  // Sort the list so the highest scores appear at the top
  scores.sort(function(a,b){ return a[0]-b[0]; })
  scores.reverse()
  return scores.slice(0,n)
}


/**
 * transformPrefs.
 *
 * Swap the people and the items.
 *
 */
 function transformPrefs(prefs) {
  var result = {}
    , person, item;
  for (person in prefs) {
    for (item in prefs[person]) {
      if (!result[item]) { result[item] = {} }  //result.setdefault(item,{})
      // Flip item and person
      result[item][person]=prefs[person][item];
    }
  }
  return result
}
