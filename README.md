# node-recommendations

  Node.js recommendations module

## Installation

      $ npm install node-recommendations

## Use

### Create a Recommendations instance
Which allow you to pass a name (and an options object), used for namespacing within Redis so that you may have several recommendation systems in the same db.
```js
var recommendations = require('node-recommendations');
var options = {
    correlation: 'distance' // distance and pearson are implemented
  , redisClient: null       // [optional] your redis client
};
var r = recommendations.create('Books',options);
```

### Add people and critics
With a name and an optional id (otherwise the id is generated).
```js
var p = r.addPeople('Joe','optional-id'); // add a new person to the data
p.addItem('Batman',4,'optional-id'); 			// add a critic score to Joe
p.addItem('Superman',3.5); 					 			// another...
p.addItem('Titanic',1);
```

### Calculate the items similitudes
This calculation is needed to get recommendations for people.
The operation is costly, so run it on another machine, or in dead hours.
```js
r.calculateItemsim(function(err,res) { ... });
```

### Get a person by his name
```js
var person = r.getPeopleByName('Joe');
```

### Get recommendations for a person
```js
person.getRecommendations();
```

## Example
```js
var recommendations = require('node-recommendations');
var critics = {'Lisa Rose': {'Lady in the Water': 2.5, 'Snakes on a Plane': 3.5,
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
var r = recommendations.create('test',{correlation: 'pearson'});
for (var j in critics) {
  var name = j
    , p    = r.addPeople(name);
  for (var i in critics[name]) p.addItem(i,critics[name][i]);
}
r.calculateItemsim(function(err,res) { // calculate similar items
  if (err) console.error(err);
  else {
    r.getPeopleByName(p.name, function(err,person) { // get last person
      person.getRecommendedItems(function(err,res) {
        if (err) console.log(err);
        console.log('%o',res); // recommendations for 'person'
        process.exit(0);
      });
    }); 
  }
});

```

## To do
 - Automatic calculation

## Author

Philmod &lt;philippe.modard@gmail.com&gt;