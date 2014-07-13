// Projects -- {name: String}
Projects = new Meteor.Collection('projects');

// Publish complete set of projects to all clients.
Meteor.publish('projects', function () {
	return Projects.find();
});


// Tasks -- {text: String,
//					 done: Boolean,
//					 tags: [String, ...],
//					 project_id: String,
//					 timestamp: Number}
Tasks = new Meteor.Collection('tasks');

// Publish all items for requested project_id.
Meteor.publish('tasks', function (project_id) {
	check(project_id, String);
	return Tasks.find({project_id: project_id});
});

// Resources -- {name: String,
//					 vacations: Array}
Resources = new Meteor.Collection('resources');

// Publish all the resources
Meteor.publish('resources', function () {
	return Resources.find();
});