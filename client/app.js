// Client-side JavaScript, bundled and sent to client.

// Define Minimongo collections to match server/publish.js.
Projects = new Meteor.Collection('projects');
Tasks = new Meteor.Collection('tasks');
Resources = new Meteor.Collection('resources');

// ID of currently selected project
Session.setDefault('project_id', null);

// Name of currently selected tag for filtering
Session.setDefault('filters', null);

// When adding tag to a task, ID of the task
Session.setDefault('editing_addtag', null);

// When editing a project name, ID of the project
Session.setDefault('editing_projectname', null);

// When editing task text, ID of the task
Session.setDefault('editing_itemname', null);

// Subscribe to 'projects' collection on startup.
// Select a project once data has arrived.
var projectsHandle = Meteor.subscribe('projects', function () {
	if (!Session.get('project_id')) {
		var project = Projects.findOne({}, {sort: {name: 1}});
		if (project) {
			Router.setProject(project._id);
		}
	}
});

var tasksHandle = null;
// Always be subscribed to the tasks for the selected project.
Deps.autorun(function () {
	var project_id = Session.get('project_id');
	if (project_id) {
		tasksHandle = Meteor.subscribe('tasks', project_id);
	} else {
		tasksHandle = null;
	}
});

////////// Helpers for in-place editing //////////

// Returns an event map that handles the 'escape' and 'return' keys and
// 'blur' events on a text input (given by selector) and interprets them
// as 'ok' or 'cancel'.
var okCancelEvents = function (selector, callbacks) {
	var ok = callbacks.ok || function () {};
	var cancel = callbacks.cancel || function () {};

	var events = {};
	events['keyup '+selector+', keydown '+selector+', focusout '+selector] =
		function (evt) {
			if (evt.type === 'keydown' && evt.which === 27) {
				// escape = cancel
				cancel.call(this, evt);

			} else if (evt.type === 'keyup' && evt.which === 13 ||
								 evt.type === 'focusout') {
				// blur/return/enter = ok/submit if non-empty
				var value = String(evt.target.value || '');
				if (value)
					ok.call(this, value, evt);
				else
					cancel.call(this, evt);
			}
		};

	return events;
};

var activateInput = function (input) {
	input.focus();
	input.select();
};

////////// Dates //////////

Meteor.subscribe('resources');
Meteor.call('getDates', function(err, data) {
	Session.set('months', data);
});
Template.timeline.months = function () {
	return Session.get('months');
};
Template.timeline.resources = function () {
	return Resources.find();
}

Template.timeline.initSortables = function () {
	Meteor.defer(function () {

		// Create the task sortables
		$('.resource-tasks').sortable({
			connectWith: 			'.resource-tasks',
			containment: 			'#g-resources',
			cursor: 				'move',
			delay: 					150,
			distance: 				5,
			forceHelperSize: 		true,
			forcePlaceholderSize: 	true,
			items: 					'.resource-task',
			tolerance: 				'pointer',
			update: 				handleTaskDrop
		});

		// Update all the task sizes
		$('.resource-tasks').each(function(i, el) {
			updateTaskDisplaySizes($(el));
		});


	});
}

Template.timeline.rendered = function () {

	// Attach event to zoom level input
	$('#zoom-slider > input').on('change', function(e) {
		var zoom = $(this).val();
		$('body').attr('data-zoom', zoom);
		$('#g-timeline table thead .resources').attr('rowspan', (zoom == 1) ? 1 : 2);
		$('.resource-tasks').each(function(i, el) {
			updateTaskDisplaySizes($(el));
		});
	});

	$(window).on('resize', function() {
		$('.resource-tasks').each(function(i, el) {
			updateTaskDisplaySizes($(el));
		});
	});

};



function handleTaskDrop(e, ui) {
	updateTaskDisplaySizes($(ui.sender));
	updateTaskDisplaySizes($(ui.item).parent());
}

function updateTaskDisplaySizes(list) {

	// Get the resource's capacity
	var capacityMultiplier = 1 / parseFloat(list.attr('data-capacity'));

	// Figure out the starting position counter
	var pos = 0;

	// Loop through tasks
	list.children().each(function(i, el) {

		// Set display size to base task size
		var displaySize = Math.round(parseInt($(el).attr('data-size')) * capacityMultiplier);

		// If the task overlaps a weekend, automatically add 8 size units to task
		if (((pos + displaySize) % 28) >= 20) {
			displaySize = displaySize + 8;
		}

		// Set the display size
		$(el).attr('data-display-size', displaySize);

		// Increment the position by the display size
		pos = pos + displaySize;

	});

}

////////// Projects //////////

Template.projects.loading = function () {
	return !projectsHandle.ready();
};

Template.projects.projects = function () {
	return Projects.find({}, {sort: {name: 1}});
};

Template.projects.events({
	'mousedown .project': function (evt) { // select project
		Router.setProject(this._id);
	},
	'click .project': function (evt) {
		// prevent clicks on <a> from refreshing the page.
		evt.preventDefault();
	},
	'dblclick .project': function (evt, tmpl) { // start editing project name
		Session.set('editing_projectname', this._id);
		Deps.flush(); // force DOM redraw, so we can focus the edit field
		activateInput(tmpl.find('#project-name-input'));
	}
});

// Attach events to keydown, keyup, and blur on 'New project' input box.
Template.projects.events(okCancelEvents(
	'#new-project',
	{
		ok: function (text, evt) {
			var id = Projects.insert({name: text});
			Router.setProject(id);
			evt.target.value = '';
		}
	}));

Template.projects.events(okCancelEvents(
	'#project-name-input',
	{
		ok: function (value) {
			Projects.update(this._id, {$set: {name: value}});
			Session.set('editing_projectname', null);
		},
		cancel: function () {
			Session.set('editing_projectname', null);
		}
	}));

Template.projects.selected = function () {
	return Session.equals('project_id', this._id) ? 'selected' : '';
};

Template.projects.name_class = function () {
	return this.name ? '' : 'empty';
};

Template.projects.editing = function () {
	return Session.equals('editing_projectname', this._id);
};

////////// Tasks //////////

Template.tasks.loading = function () {
	return tasksHandle && !tasksHandle.ready();
};

Template.tasks.any_project_selected = function () {
	return !Session.equals('project_id', null);
};

Template.tasks.events(okCancelEvents(
	'#new-task',
	{
		ok: function (text, evt) {
			var tag = Session.get('tags');
			Tasks.insert({
				text: text,
				project_id: Session.get('project_id'),
				done: false,
				timestamp: (new Date()).getTime(),
				tags: tag ? [tag] : []
			});
			evt.target.value = '';
		}
	}));

Template.tasks.tasks = function () {
	// Determine which tasks to display in main pane,
	// selected based on project_id and filters.

	var project_id = Session.get('project_id');
	if (!project_id) {
		return {};
	}

	var sel = {project_id: project_id};
	var filters = Session.get('filters');
	if (filters) {
		sel.tags = filters;
	}

	return Tasks.find(sel, {sort: {timestamp: 1}});
};

Template.task_item.tag_objs = function () {
	var task_id = this._id;
	return _.map(this.tags || [], function (tag) {
		return {task_id: task_id, tag: tag};
	});
};

Template.task_item.done_class = function () {
	return this.done ? 'done' : '';
};

Template.task_item.editing = function () {
	return Session.equals('editing_itemname', this._id);
};

Template.task_item.adding_tag = function () {
	return Session.equals('editing_addtag', this._id);
};

Template.task_item.events({
	'click .check': function () {
		Tasks.update(this._id, {$set: {done: !this.done}});
	},

	'click .destroy': function () {
		Tasks.remove(this._id);
	},

	'click .addtag': function (evt, tmpl) {
		Session.set('editing_addtag', this._id);
		Deps.flush(); // update DOM before focus
		activateInput(tmpl.find('#edittag-input'));
	},

	'dblclick .display .task-text': function (evt, tmpl) {
		Session.set('editing_itemname', this._id);
		Deps.flush(); // update DOM before focus
		activateInput(tmpl.find('#task-input'));
	},

	'click .remove': function (evt) {
		var tag = this.tag;
		var id = this.task_id;

		evt.target.parentNode.style.opacity = 0;
		// wait for CSS animation to finish
		Meteor.setTimeout(function () {
			Tasks.update({_id: id}, {$pull: {tags: tag}});
		}, 300);
	}
});

Template.task_item.events(okCancelEvents(
	'#task-input',
	{
		ok: function (value) {
			Tasks.update(this._id, {$set: {text: value}});
			Session.set('editing_itemname', null);
		},
		cancel: function () {
			Session.set('editing_itemname', null);
		}
	}));

Template.task_item.events(okCancelEvents(
	'#edittag-input',
	{
		ok: function (value) {
			Tasks.update(this._id, {$addToSet: {tags: value}});
			Session.set('editing_addtag', null);
		},
		cancel: function () {
			Session.set('editing_addtag', null);
		}
	}));

////////// Tag Filter //////////

// Pick out the unique tags from all tasks in current project.
Template.filters.tags = function () {
	var tag_infos = [];
	var total_count = 0;

	Tasks.find({project_id: Session.get('project_id')}).forEach(function (task) {
		_.each(task.tags, function (tag) {
			var tag_info = _.find(tag_infos, function (x) { return x.tag === tag; });
			if (! tag_info) {
				tag_infos.push({tag: tag, count: 1});
			} else {
				tag_info.count++;
			}
		});
		total_count++;
	});

	tag_infos = _.sortBy(tag_infos, function (x) { return x.tag; });
	tag_infos.unshift({tag: null, count: total_count});

	return tag_infos;
};

Template.filters.tag_text = function () {
	return this.tag || 'All items';
};

Template.filters.selected = function () {
	return Session.equals('filters', this.tag) ? 'selected' : '';
};

Template.filters.events({
	'mousedown .tag': function () {
		if (Session.equals('filters', this.tag)) {
			Session.set('filters', null);
		}
		else {
			Session.set('filters', this.tag);
		}
	}
});

////////// Tracking selected project in URL //////////

var TasksRouter = Backbone.Router.extend({
	routes: {
		':project_id': 'main'
	},
	main: function (project_id) {
		var oldProject = Session.get('project_id');
		if (oldProject !== project_id) {
			Session.set('project_id', project_id);
			Session.set('filters', null);
		}
	},
	setProject: function (project_id) {
		this.navigate(project_id, true);
	}
});

Router = new TasksRouter;

Meteor.startup(function () {
	Backbone.history.start({pushState: true});
	$('body').attr('data-zoom', '2');
});