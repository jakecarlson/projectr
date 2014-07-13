// Equals operator
UI.registerHelper('equals', function (a, b) {
	return a === b;
});

// Add keys
UI.registerHelper('keys', function (all) {
    return _.map(all, function(i, k) {
        return {key: k, val: i};
    });
});