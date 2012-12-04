/*!
 * node-recommendations
 * Copyright(c) 2012 Philmod <philippe.modard@gmail.com>
 * MIT Licensed
 */


/**
 * Module dependencies.
 */

var _      = require('underscore')
  , uuid   = require('node-uuid')
  , redis  = require('redis')
  , util   = require('util')
  , crypto = require('crypto')
  , correlation = require('./correlation.js')
  ;


/**
 * Library version.
 */

var version = '0.0.2';


/**
 * Parameters.
 */

var updateN = 0 // after this number, the matrices are recalculated
  , updateT = 1 // hours
  ;


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
  , this.matrices = new Matrices(options.correlation || 'distance', this)
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
  // this.people[p.name] = p;
  return p;
}
Recommendations.prototype.getPeopleByName = function(name,callback) {
  var p = new Person(name,this);
  p.getByName(callback);
}
Recommendations.prototype.getUsers = function(callback) {
  r.keys(this.usersKey+'*', callback);
}
Recommendations.prototype.getCriticsusers = function(callback) {
  var that = this
    , criticsUser = [];
  this.getUsers(function(err,users) {
    if (err) return callback(err);
    var nb = users.length;
    that.n = nb;
    for (var i=0,max=users.length; i<max; i++) {
      (function(i){
        var args = [users[i],'inf',0,'WITHSCORES'];
        criticsUser.push(users[i]);
        r.zrevrangebyscore(args,function(err,items) {
          if (err) return callback(err);
          var out = {};
          for (var j=0,max2=items.length; j<max2; j+=2) {
            out[items[j]] = parseFloat(items[j+1]);
          }
          criticsUser[users[i]] = out;
          if (nb-- == 1) callback(criticsUser);
        });
      })(i);
    }
  });
}
Recommendations.prototype.pushItemsim = function(itemsim, callback) {
  console.log('TO DO ...');
  console.log('%o',itemsim);


  
}
Recommendations.prototype.calculateItemsim = function(callback) {
  var that = this;
  this.getCriticsusers(function(err,criticsUser) {
    if (err) return callback(err);
    var itemsim = calculateSimilarItems(criticsUser,that.n);
    that.pushItemsim(itemsim,callback);
  });
}

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
  , this.mat   = recommendations.matrices
  ;
  return this;
}
Person.prototype.addItem = function(name,score,id,noSave) {
  this.items.push(new Item(name,score,this,id,noSave));
}
Person.prototype.getRecommendedItems = function() {
  return this.mat.getRecommendedItems(this.name);
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
  this.person.mat.pushItem(this.name, person.name, this.score);
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
  /*var args = [this.person.key,this.score,this.name];
  this.db.zadd(args,callback);*/
}

/**
 * Matrices
 *
 */
var Matrices = function(correlation, recommendations) {
    this.criticsItem = []
  , this.criticsUser = []
  , this.itemsim     = []
  , this.n           = null
  , this.lastUpdate  = null
  , this.itemsAddedWithoutCalc = 0
  , this.correlation = correlation
  , this.recommendations = recommendations
  , this.db = this.recommendations.client
  ;
}
Matrices.prototype.reload = function() { //callback
  console.log('TO DO ...');
  console.log('%o',this.db);
  /*this.db.keys(this.recommendations.usersKey, function(err,res) {
    if (err) console.log('ERROR reload : ' + err);
    else {
      console.log('RELOAD RESULTS : ');
      console.log('%o',res);
    }
  })*/
  // this.criticsUser = 
}
Matrices.prototype.pushItem = function(itemID, pName, score) {
  if (!this.criticsItem[itemID]) this.criticsItem[itemID] = {};
  this.criticsItem[itemID][pName] = score;
  this.itemsAddedWithoutCalc += 1;
  if (this.itemsAddedWithoutCalc > updateN) {
    this.calcItemsim();
    this.itemsAddedWithoutCalc = 0;
  }
}
Matrices.prototype.criticsItem2User = function() {
  this.criticsUser = transformPrefs(this.criticsItem);
  console.log('CRITICS ITEM :'); console.log('%o',this.criticsItem);
  console.log('CRITICS USER :'); console.log('%o',this.criticsUser);
  this.reload();
}
Matrices.prototype.calcItemsim = function() {
  this.criticsItem2User();
  this.n = this.tailleS(this.criticsUser);
  this.itemsim = this.calculateSimilarItems(this.criticsUser, this.n);
  this.lastUpdate = new Date();
}
var calculateSimilarItems = Matrices.prototype.calculateSimilarItems = function(prefs,n) {
  // Create a dictionary of items showing which other items they are most similar to.
  var result={};
  // Invert the preference matrix to be item-centric
  var itemPrefs = transformPrefs(prefs);
  c=0;
  for (var item in itemPrefs) {
    // Status updates for large datasets
    c+=1;
    if (c%100==0) { 
      console.log(c + ' ' + tailleS(itemPrefs)) 
    }
    // Find the most similar items to this one
    var scores = topMatches(itemPrefs,item, n || 10, this.correlation);
    result[item] = scores;
  }
  return result
}

/**
 * tailles.
 *
 */
var tailles = Matrices.prototype.tailleS = function(S) {
  len = 0;
  for (item in S) {
    len += 1;
  }
  return len
}
Matrices.prototype.getRecommendedItems = function(pName) {
  var userRatings = this.criticsUser[pName];
  var itemMatch   = this.itemsim;
  var scores={}
    , totalSim={};
  // Loop over items rated by this user
  for (var item in userRatings) { //(item,rating) in userRatings.items():
    rating = userRatings[item];
    // Loop over items similar to this one
    for (var item2 in itemMatch[item]) { // (similarity,item2) in itemMatch[item]:
      var similarity = itemMatch[item][item2][0]; 
      var item3 = itemMatch[item][item2][1]; 
      // Ignore if this user has already rated this item
      if (item3 in userRatings) { continue }
      // Weighted sum of rating times similarity
      if (!scores[item3]) { scores[item3] = 0 }  //scores.setdefault(item2,0)
      scores[item3]+=similarity*rating;
      // Sum of all the similarities
      if (!totalSim[item3]) { totalSim[item3] = 0 }  //totalSim.setdefault(item2,0)
      totalSim[item3]+=similarity;
    }
  }
  // Divide each total score by total weighting to get an average
  var rankings = []
    , i=0;
  for (var item in scores) {
    var score = scores[item]/totalSim[item];
    if (!isNaN(score)) {
      rankings[i] = [ score, item ];
      i+=1;
    }
  }
  // Return the rankings from highest to lowest
  rankings.sort(function(a,b){ return a[0]-b[0]; })
  rankings.reverse()
  return rankings
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
  i=0;
  var scores = [];
  for (var other in prefs) {
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
  var result={}
  for (var person in prefs) {
    for (var item in prefs[person]) {
      if (!result[item]) { result[item] = {} }  //result.setdefault(item,{})
      // Flip item and person
      result[item][person]=prefs[person][item];
    }
  }
  return result
}


