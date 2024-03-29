var KEY_CODE_ENTER      = 13;
var throttleHandle      = null;

if (Meteor.is_client) {

  Template.header.isVisible = function() {
    return !getCurrentShoppingListId(false);
  }

  Template.addForm.events = {
    'focusin input': function(e) {
      if (e.target.value === $(e.target).attr('data-default'))
        e.target.value = '';
    },

    'focusout input': function(e) {
      if(e.target.value.trim().length === 0)
        e.target.value = $(e.target).attr('data-default');
    },

    'keyup input': function(e) {

      if (e.keyCode == KEY_CODE_ENTER) {
        e.preventDefault();

        var atLeastOneValidUrl = false;

        // If multiple lines is pasted in the textbox, 
        // the line breaks will be converted to spaces by
        // the browser.
        _.each(e.target.value.split(" "), function(str) {
          var url = isValidWebUrl(str) ? str : null;
          if (!url) {
            $(e.target).addClass('invalid');
            // Invalid url 
            // TODO: Flash red or something.
            return;
          }
          atLeastOneValidUrl = true;
          addRecipeUrl(url);
        })
        
        
        if (atLeastOneValidUrl) {
          $(e.target).removeClass('invalid');
          e.target.value = '';
          e.target.blur();
        }


      }

    }
  }

  Template.addForm.rendered = function() {
    Meteor.defer(function() {
      $i = $("#add-form input");
      if (!$i.val())
        $i.val($i.attr('data-default'));
      
    })
  }

  Template.shoppingList.QRURL = function() {
    return encodeURIComponent(window.location);
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

  Template.shoppingList.isInputVisible = function() {
    return Session.get('shoppingListNameLabelFocused');
  }

  Template.shoppingList.rendered = function() {
    Meteor.defer(function(){
      if(Template.shoppingList.isInputVisible)
        $('#listNameInput').focus();
    });
  }

  Template.shoppingList.howMuch = function() {
    if (this.amount && this.unit)
      return ["(", this.amount, " ", this.unit, ")"].join("");
    return "";
  }

  Template.shoppingList.events = {
    
    'click h1': function(e) {
      Session.set('shoppingListNameLabelFocused', true)
    },

    'focusout input': function(e) {
      Session.set('shoppingListNameLabelFocused', false)
    },

    'keyup input': function(e) {

      if (e.keyCode == KEY_CODE_ENTER) {
        e.preventDefault();
        e.target.blur();  
      }

      var val = e.target.value,
          slid = getCurrentShoppingListId();

      if (!val || (val && val.length < 3))
        return; // don't save too short values


      clearTimeout(throttleHandle);
      throttleHandle = Meteor.setTimeout(function() {
        // Create a url-friendly name for the playlist,
        // by stripping all characters that are not a-z, 0-9 or dashes,
        // and replacing spaces with dashes.
        var nameSimple = val.toLowerCase().replace(" ", "-").replace(/[^a-z0-9\-]/gi, '');
        ShoppingLists.update(slid, { $set: { name: val, name_simple: nameSimple } })


        Meteor.router.navigate("/"+nameSimple, { trigger: true } );

      }, 500)
    }
  }

}

if (Meteor.is_server) {

  Meteor.methods({

    getRecipe: function (url, callback) {
      url = url.replace('www.',''); // FIXME: Thsi should be done by API
      var escapedRecipeUrl = encodeURIComponent(url),
          apiUrl = "http://openrecipe-api.herokuapp.com/v1/recipes/" + escapedRecipeUrl;

      return Meteor.http.call("GET", apiUrl, {});
    }

  });

  Meteor.startup(function () {
    // code to run on server at startup
  });
}

function addRecipeUrl(url) {
  var slid = getCurrentShoppingListId(true);

  Meteor.call('getRecipe', url, function(err, result) {
    
    if (result.error) {
      console.warn("API reported error, status code:", result.statusCode)
      return;
    }

    var data = JSON.parse(result.content);

    // Flatten ingredients
    var ingredientsAll = [];
    _.each(data, function(recipe) {
      for (var groupName in recipe.ingredients) {
        var ingredientsInGroup = recipe.ingredients[groupName];
        _.each(ingredientsInGroup, function(ingredient) {
          ingredientsAll.push(ingredient);
        })
      }
    })

    _.each(ingredientsAll, function(ingredient) {
      ingredient.shopping_list_id = slid;

      // Does it exist in this shopping list already?
      var existing = 
        Ingredients.findOne(
          { shopping_list_id: slid, 
            name: ingredient.name, 
            unit: ingredient.unit });

      if (existing) {
        if(existing.amount > 0)
          Ingredients.update(existing._id, { $inc: { amount: ingredient.amount } } )
      } else {
        Ingredients.insert(ingredient);  
      }

    });
  })
  
}



function getCurrentShoppingListId(create) {
  
  if (create && !Session.get('shopping_list_id')) {
    var shoppingListId = ShoppingLists.insert({});
    Session.set('shopping_list_id', shoppingListId);
    var url = "list/" + shoppingListId;
    Meteor.router.navigate(url, { trigger: true } );
  }
  if (Session.get('shopping_list_simple_name')) {
    var shoppingList = ShoppingLists.findOne({ name_simple: Session.get('shopping_list_simple_name')});
    if (shoppingList)
      return shoppingList._id;
  }
  return Session.get('shopping_list_id');
}

function isValidWebUrl(str) {
  var regEx = new RegExp(
        "^(http:\/\/|http:\/\/www.|https:\/\/www.|www.){1}([0-9A-Za-z]+\.)");
  return regEx.test(str);
}


