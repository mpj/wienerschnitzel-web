
// The client router, using Backbone routing.
// http://documentcloud.github.com/backbone/#Router
var ClientRouter = Backbone.Router.extend({

    routes: {
      '': 'showRoot',
      '/': 'showRoot',
      'list/:shopping_list_id': 'showShoppingList'
    },

    showRoot: function() {
      console.log("showRoot")
      Session.set("shopping_list_id", null);
    },

    showShoppingList: function( shopping_list_id ) {
      Session.set("shopping_list_id", shopping_list_id); 
    }

});

Meteor.router = new ClientRouter;
Backbone.history.start( { pushState: true } );