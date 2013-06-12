/**
 * sim_distance.
 *
 * Returns a DISTANCE-based similarity score for p1 and p2.
 *
 */
exports.sim_distance = function(prefs,p1,p2){
  // Get the list of shared_items
  var si={}
    , item
    ;
  for (item in prefs[p1]) {
    if (item in prefs[p2]) {
      si[item]=1
    }
  }
  // if they have no ratings in common, return 0
  if (tailleS(si)==0) { return 0 }
  // Add up the squares of all the differences
  var sum_of_squares = 0
    , item
    ;
  for (item in prefs[p1]) {
    if (item in prefs[p2]) {
      sum_of_squares = sum_of_squares + Math.pow( prefs[p1][item]-prefs[p2][item] ,2);
    }
  }
  return 1/(1+sum_of_squares) 
}



/**
 * sim_pearson.
 *
 * Returns the PEARSON correlation coefficient for p1 and p2.
 *
 */
exports.sim_pearson = function(prefs,p1,p2) {
  // Get the list of mutually rated items
  var si={}
    , item
    ;
  for (item in prefs[p1]) {
    if (item in prefs[p2]) { si[item]=1; }
  }
  // Find the number of elements
  
  var n=tailleS(si);
  // if they are no ratings in common, return 0
  if (n===0) { return 0; }
    
  var sum1 = 0,
    sum2 = 0,
    sum1Sq = 0,
    sum2Sq = 0,
    pSum = 0,
    it;
  for (it in si) {
    // Add up all the preferences
    sum1 += prefs[p1][it];
    sum2 += prefs[p2][it];
    // Sum up the squares
    sum1Sq += Math.pow(prefs[p1][it],2);
    sum2Sq += Math.pow(prefs[p2][it],2);
    // Sum up the products
    pSum += prefs[p1][it]*prefs[p2][it];
  }  
  
  // Calculate Pearson score
  var num=pSum-(sum1*sum2/n);
  var den=Math.pow( (sum1Sq-Math.pow(sum1,2)/n)*(sum2Sq-Math.pow(sum2,2)/n) ,0.5);
    
  if (den===0) { return 0; }
  r=num/den;
  return r
}


function tailleS(S) {
	var len = 0
    , item;
	for (item in S) {
		len += 1;
	}
	return len
}
