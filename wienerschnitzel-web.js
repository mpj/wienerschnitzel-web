Ingredients = new Meteor.Collection('ingredients');
ShoppingLists = new Meteor.Collection('shopping_lists');

var KEY_CODE_ENTER      = 13;

if (Meteor.is_client) {

  Template.addForm.events = {
    'keyup input': function(e) {

      if (e.keyCode == KEY_CODE_ENTER) {
        e.preventDefault();
        
        var url = isValidWebUrl(e.target.value) ? e.target.value : null;
        if (url) {

          var slid = getCurrentShoppingListId();

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
        } else {
          console.log("url not valid")
        }

      }

    }
  }

  Template.shoppingList.ingredients = function() {
    return Ingredients.find(
      { shopping_list_id: getCurrentShoppingListId() });
  }

}

if (Meteor.is_server) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}

function getCurrentShoppingListId() {
  if (!Session.get('shopping_list_id')) {
    var shoppingList = ShoppingLists.insert({});
    Session.set('shopping_list_id', shoppingList._id);
  }
  return Session.get('shopping_list_id');
}


function isValidWebUrl(str) {
  var regEx = new RegExp(
        "^(http:\/\/www.|https:\/\/www.|www.){1}([0-9A-Za-z]+\.)");
  return regEx.test(str);
}