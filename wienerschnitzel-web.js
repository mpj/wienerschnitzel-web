Ingredients = new Meteor.Collection('ingredients');
ShoppingLists = new Meteor.Collection('shopping_lists');

var KEY_CODE_ENTER      = 13;
var throttleHandle      = null;

if (Meteor.is_client) {

  Template.header.isVisible = function() {
    return !getCurrentShoppingListId(false);
  }

  Template.addForm.events = {
    'keyup input': function(e) {

      if (e.keyCode == KEY_CODE_ENTER) {
        e.preventDefault();
        
        var url = isValidWebUrl(e.target.value) ? e.target.value : null;
        if (!url)
          // Invalid url 
          return;

        var slid = getCurrentShoppingListId(true);

        // TODO: Get the ingredients from api
        var ingredients = [
          { name: 'Mjölk', unit: "dl", amount: 5 },
          { name: 'Korv', unit: "st", amount: 2 }
        ];

        _.each(ingredients, function(ingredient) {
          ingredient.shopping_list_id = slid;

          // Does it exist in this shopping list already?
          var existing = 
            Ingredients.findOne(
              { shopping_list_id: slid, 
                name: ingredient.name, 
                unit: ingredient.unit });

          if (existing) {
            Ingredients.update(existing._id, { $inc: { amount: ingredient.amount } } )
          } else {
            Ingredients.insert(ingredient);  
          }

        });


      }

    }
  }

  Template.shoppingList.listName = function() {
    var list = ShoppingLists.findOne(getCurrentShoppingListId());
    return !!list && !!list.name ? list.name : "Inköpslista";
  }

  Template.shoppingList.isVisible = function() {
    return !!getCurrentShoppingListId();
  }

  Template.shoppingList.ingredients = function() {
    return Ingredients.find(
      { shopping_list_id: getCurrentShoppingListId(false) });
  }

  Template.shoppingList.events = {
    'keyup input': function(e) {
      var val = e.target.value,
          slid = getCurrentShoppingListId();

      clearTimeout(throttleHandle);
      Meteor.setTimeout(function() {
        ShoppingLists.update(slid, { $set: { name: val } })
      }, 500)
    }
  }



}

if (Meteor.is_server) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}


function getCurrentShoppingListId(create) {
  
  if (create && !Session.get('shopping_list_id')) {
    var shoppingListId = ShoppingLists.insert({});
    Session.set('shopping_list_id', shoppingListId);
    var url = "list/" + shoppingListId;
    Meteor.router.navigate(url, { trigger: true } );

  }
  return Session.get('shopping_list_id');
}

function isValidWebUrl(str) {
  var regEx = new RegExp(
        "^(http:\/\/|http:\/\/www.|https:\/\/www.|www.){1}([0-9A-Za-z]+\.)");
  return regEx.test(str);
}


