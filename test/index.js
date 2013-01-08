/**
 * Module dependencies.
 */

var recommendations = require('../')
  , should = require('should')
  , assert = require('assert')
  ;

/**
 * Data.
 */
var critics={'Lisa Rose': {'Lady in the Water': 2.5, 'Snakes on a Plane': 3.5,
  'Just My Luck': 3.0, 'Superman Returns': 3.5, 'You, Me and Dupree': 2.5,
  'The Night Listener': 3.0},
  'Gene Seymour': {'Lady in the Water': 3.0, 'Snakes on a Plane': 3.5,
  'Just My Luck': 1.5, 'Superman Returns': 5.0, 'The Night Listener': 3.0,
  'You, Me and Dupree': 3.5},
  'Michael Phillips': {'Lady in the Water': 2.5, 'Snakes on a Plane': 3.0,
  'Superman Returns': 3.5, 'The Night Listener': 4.0},
  'Claudia Puig': {'Snakes on a Plane': 3.5, 'Just My Luck': 3.0,
  'The Night Listener': 4.5, 'Superman Returns': 4.0,
  'You, Me and Dupree': 2.5},
  'Mick LaSalle': {'Lady in the Water': 3.0, 'Snakes on a Plane': 4.0,
  'Just My Luck': 2.0, 'Superman Returns': 3.0, 'The Night Listener': 3.0,
  'You, Me and Dupree': 2.0},
  'Jack Matthews': {'Lady in the Water': 3.0, 'Snakes on a Plane': 4.0,
  'The Night Listener': 3.0, 'Superman Returns': 5.0, 'You, Me and Dupree': 3.5},
  'Toby': {'Snakes on a Plane':4.5,'You, Me and Dupree':1.0,'Superman Returns':4.0}};


/**
 * Parameters.
 */
var name = 'test';

/**
 * Tests
 */
describe('recommendations', function(){

  var r,item,person;

  it('should creates the recommendations instance', function(done){
    var options = {correlation: 'distance'};
    r = recommendations.create(name,options);
    r.should.have.property('name');
    r.should.have.property('options');
    r.should.have.property('client');
    done();
  });


  it('should clear the database for this namespace', function(done){
    r.client.keys(name+':*', function(err,res) {      
      var cmds = [];
      res.forEach(function(k) {
        cmds.push(['del', k]);
      });
      r.client.multi(cmds).exec(function(err,res) {
        should.equal(err,null);
        done();
      });      
    })
  });

  it('should creates the people and critics', function(done){
    for (var j in critics) {
      var name = j;
      var p = r.addPeople(name);
      for (var i in critics[name]) p.addItem(i,critics[name][i]);
    }
    item = i;
    person = p.name;
    done();
  });

  it('should calculate the item similarities', function(done){
    r.calculateItemsim(function(err,res) {
      should.equal(err,null);
      res.should.have.property(item);
      done();
    });
  });

  it('should return the recommended items', function(done){
    r.getPeopleByName(person, function(err,p) { // get last person
      p.getRecommendedItems(function(err,res) {
        should.equal(err,null);
        res['The Night Listener'].should.equal(3.182634730538922);
        res['Just My Luck'].should.equal(2.5983318700614575);
        res['Lady in the Water'].should.equal(2.4730878186968837);
        done();
      });
    }); 
  });


});
