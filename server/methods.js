Meteor.methods({

	// Get holidays
	getHolidays: function () {

		// Set the start and end dates
	    var currentDate = moment();
		var endDate = moment().add('days', 90);

		// Call the holiday service and get results
		var holidayService = 'http://kayaposoft.com/enrico/json/v1.0/?action=getPublicHolidaysForDateRange&fromDate=<start_date>&toDate=<end_date>&country=usa&region=District+Of+Columbia';
		var url = holidayService.replace('<start_date>', currentDate.format('DD-MM-YYYY')).replace('<end_date>', endDate.format('DD-MM-YYYY'));
		var results = Meteor.http.get(url).data;

		// Loop through results
		var holidays = [];
		for (var i = 0, numResults = results.length; i < numResults; ++i) {
			//console.log(results[i]);
			holidays.push({
	    		//date: 	moment(results[i].date.year+'-'results[i].date.month+'-'+results[i].date.day),
	    		month: 	results[i].date.month,
	    		day: 	results[i].date.day,
	    		name: 	results[i].englishName
	    	});
		}

		// Return the holidays
		return holidays;

	},

	// Get dates for timeline
	getDates: function() {

		// Initialize months
		var months = [];
		var currentDate = moment();
		var endDate = moment().add('days', 90);

		var holidays = Meteor.call('getHolidays');
		var numHolidays = holidays.length;

		// Loop through dates
		var i = -1;
		var first = true;
		while (currentDate <= endDate) {

			// Set month and day
			var year = currentDate.year();
			var month = currentDate.month()+1;
			var day = currentDate.date();

			// If this is the first day or the first day of the month, add the new month
			if (first || (day == 1)) {
				++i;
				months[i] = {
					name: 	moment(currentDate).format('MMMM'),
					year: 	year,
					num: 	month,
					days: 	[]
				};
				first = false;
			}

			// See if the day is a holiday
			var holiday = false;
			for (var n = 0; n < numHolidays; ++n) {
				if ((holidays[n].month == month) && (holidays[n].day == day)) {
					holiday = holidays[n].name;
					break;
				}
			}

			// Add the day to the months array
			months[i].days.push({
				num: 		day,
				dow: 		currentDate.day(),
				holiday: 	holiday
			});

			// Increment date
			currentDate.add('days', 1);

		}

		// Save months to session
		return months;

	}

});