# node-recommendations

  Node.js recommendations module

## Use

### Create a Recommendations Object
With a name (and an options object).
```js
var options = {};
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
var r = recommendations.create('test',{});
for (var j in critics) {
  var name = j;
  var p = r.addPeople(name);
  for (var i in critics[name]) p.addItem(i,critics[name][i]);
}
var person = r.getPeopleByName('Toby');
console.log(person.getRecommendedItems());
```

## To do
 - Store in a database (Redis?)
 - Manage the moment of calculation (costly)
 - Tests

## Author

Philmod &lt;philippe.modard@gmail.com&gt;