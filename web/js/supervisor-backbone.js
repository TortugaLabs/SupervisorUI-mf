 /**
  * @copyright (c) 2012, Luxbet Pty Ltd. All rights reserved.
  * @license http://www.opensource.org/licenses/BSD-3-Clause
  */
 $(function() {
	var RUNNING_STATE = 20;

	// server model
	var SupervisorServer = Backbone.Model.extend({
		url: function() {
			return API_ROOT + 'server/details/' + this.get("id") + "/" + encodeURIComponent(this.get("ip"));
		},

		el: $("#servers"),

		defaults: function() {
			return {
				id: 0,
				name: "",
				ip: "",
				statecode: 0,
				statename: '',
				version: '',
				services: {},
				pid: 0,
				totalServices: 0,
				runningServices: 0
			};
		},

		initialize: function() {
			this.services = new SupervisorServiceList;
			this.services.server = this;
			this.services.bind('add', this.addOne, this);
			this.services.bind('reset', this.addAll, this);
			this.services.bind('all', this.render, this);

			this.cid = this.get("name");
		},

		addOne: function(service) {
			var view = new SupervisorServiceView({model: service});
			$("#" + service.collection.server.get("id") + "_services").append(view.render().el);
		},

		addAll: function() {
			this.set("totalServices", 0);
			this.set("runningServices", 0);
			this.services.each(this.addOne);
			this.countServices();
		},

		countServices: function() {
			this.set("totalServices", 0);
			this.set("runningServices", 0);
			this.services.each(function(service) {
				service.collection.server.set("totalServices", service.collection.server.get("totalServices") + 1);
				if (service.get("state") == RUNNING_STATE) {
					service.collection.server.set("runningServices", service.collection.server.get("runningServices") + 1);
				}
			});
			console.log("total: "+this.get("totalServices")+" running: "+ this.get("runningServices"));
		}
	});

	var SupervisorServerList = Backbone.Collection.extend({
		model: SupervisorServer,
		url: function() {
			return API_ROOT + 'server/list.json'
		}
	});

	var SupervisorServers = new SupervisorServerList;

	var SupervisorServerView = Backbone.View.extend({

		summaryShown: true,

		tagName: "div",

		template: _.template($('#server-template').html()),

		events: {
			"click .server-summary" : "toggleSummary",
			"click .server-details" : "toggleSummary"
		},

		initialize: function(options) {
			this.render = _.bind(this.render, this);
			this.model.bind("change:version", this.render);
			this.model.bind("change:totalServices", this.updateServiceCounts, this);
			this.model.bind("change:runningServices", this.updateServiceCounts, this);
		},

		toggleSummary: function() {
			this.$el.find('.server-summary').toggle();
			this.$el.find('.server-details').toggle();
		},

		render: function() {
			// hack: only fetch the services once we have fetched the server details
			if (this.model.get("version")) {
				this.model.services.fetch();
			}

			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},

		updateServiceCounts: function() {
			var total = parseInt(this.model.get("totalServices"));
			var running = parseInt(this.model.get("runningServices"));

			var class_name = (total != running) ? "service-count-warning" : "service-count-ok";

			var html = '<span class="' + class_name + '">'+ running + " of " + total + " running</span>";

 			this.$el.find('.server-summary-details').html(html);
		}
	});

	var SupervisorService = Backbone.Model.extend({

		syncSuccess: false,
		syncError: "",

		url: function() {
			return API_ROOT  + 'service/' +  this.collection.server.get("id") + '/'
				+ encodeURIComponent(this.collection.server.get("ip")) + '/'
				+ ((this.get('group') !=  this.get("name")) ? this.get('group') + ":" : "") + this.get("name");
		},

		initialize: function() {
			this.cid = this.collection.server.get("name") + ":" + this.get("name");
			this.set({running: (this.get("state") == RUNNING_STATE) });
			// We want to refresh after an action
			this.bind("sync", this.onUpdateSuccess, this);
			this.bind("change", this.collection.server.countServices, this.collection.server);
		},

		defaults: function() {
			return {
				name: '',
				description: '',
				state: 0,
				status_name: '',
				running: false
			};
		},

		toggleRunning: function() {
			console.log("running: " +this.get("running"));
			this.save({running: !this.get("running")});
		},
		sendSignal: function(sig) {
		  console.log("Send Signal: "+sig);
		  console.log(this.url());

		  var params = {type: 'GET', dataType: 'json'};
		  var options = {url: this.url() + '/signal/' + sig };
		  $.ajax(_.extend(params, options))
		},
		onUpdateSuccess: function(service, response) {
			if (response === true) {
				service.syncSuccess = true;
			} else {
				service.syncSuccess = false;
				service.syncError = (typeof response.error != 'undefined')
					? response.error.msg
					: "Error communicating with the server";
			}

			service.fetch();
		},

		sync: function(method, model, options) { // console.log("SupervisorServer.sync");
			var params = _.clone(options);
			params.contentType = 'application/json';
			params.data = JSON.stringify({running: model.get('running')});
			Backbone.sync(method, model, params);
		}
	});

	var SupervisorServiceList = Backbone.Collection.extend({
		model: SupervisorService,

		url: function() {
			return API_ROOT + 'service/' + this.server.get("id") + '/' + encodeURIComponent(this.server.get("ip"));
		},

		server: {}
	});

	var SupervisorServiceView = Backbone.View.extend({
		tagName: "div",

		template: _.template($('#service-template').html()),

		initialize: function() {
			_.bindAll(this, 'onModelSaved');
			this.model.bind('change', this.render, this);
			this.model.on('sync', this.onModelSaved)
		},

		onModelSaved: function(model, response, options) {
			if (!model.syncSuccess) {
				console.log(model.syncError);
				this.$el.find(".alert-message").text(model.syncError);
				this.$el.find(".alert").toggle();
			}
		},

		render: function() { // console.log("SupervisorServiceView.render");
			// console.log(this.model.toJSON());
			// Make sure this is set properly!
			this.model.set("running", this.model.get("state") == RUNNING_STATE);
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		},

		events: {
			"click .running_action" : "toggleRunning",
			"click .sigusr1" : "sendUSR1",
			"click .sighup" : "sendHUP"
		},

		toggleRunning: function() {
			this.model.toggleRunning();
			if (this.model.get("running")) {
				this.$el.find(".status").text("STARTING");
			} else {
				this.$el.find(".status").text("STOPPING");
			}
		},
		sendUSR1: function() {
		  this.model.sendSignal("USR1");
		  return false;
		},
		sendHUP: function() {
		  this.model.sendSignal("HUP1");
		  return false;
		}
	});

	var AppView = Backbone.View.extend({
		el: $("#servers"),

		initialize: function() {
			SupervisorServers.bind('add', this.addOne, this);
			SupervisorServers.bind('reset', this.addAll, this);
			SupervisorServers.bind('all', this.render, this);
			SupervisorServers.fetch();
		},

		addOne: function(server) {console.log('appending server');
			server.fetch();
			var view = new SupervisorServerView({model: server});
			this.$("#server-list").append(view.render().el);
		},

		addAll: function() {console.log('adding all servers');
			SupervisorServers.each(this.addOne);
		}

	});
	var updateServers = function() {console.log('updating servers');
		//~ SupervisorServers.fetch();

		//~ SupervisorServers.each(function(server) {
		  //~ server.fetch();
		//~ });

		SupervisorServers.each(function(server) {
		  server.services.each(function(service) {
		    service.fetch();
		  });
		});
		setTimeout(updateServers, 30*1000);
	}

	var App = new AppView;
	setTimeout(updateServers, 30*1000);
	//~ updateServers();

});
