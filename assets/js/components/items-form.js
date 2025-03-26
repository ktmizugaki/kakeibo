function ItemsForm(params) {
  if (!params.kamokus) throw new Error("kamokus is undefined");
  if (!params.items) throw new Error("items is undefined");
  if (!params.list) throw new Error("list is undefined");
  this.kamokus = params.kamokus;
  this.items = params.items;
  this.list = params.list;
  this.onDrop = this.onDrop.bind(this);
  this.onKeyDown = this.onKeyDown.bind(this);
  this.addItem = this.addItem.bind(this);
  this.removeItem = this.removeItem.bind(this);
}
ItemsForm.prototype.onDrop = function($data, event) {
  var fromRow = this.items().indexOf(event.detail.data);
  var toRow = this.items().indexOf($data);
  if (fromRow >= 0 && toRow >= 0) {
    var items = this.list().items;
    var item = items.splice(fromRow, 1)[0];
    items.splice(toRow, 0, item);
  }
};
ItemsForm.prototype.onKeyDown = function($data, event) {
  var key = event.key || event.keyCode;
  var mod = (event.ctrlKey<<0)|(event.shiftKey<<1)|(event.altKey<<2);
  var items = this.list().items;
  var elem = event.target;
  if ((""+elem.id).indexOf("item-") != 0) return true;
  var length = items().length;
  var id = (""+elem.id).split(/-/);
  id[1] = +id[1];
  id[2] = +id[2];
  if (event.isComposing === true || event.repeat === true) {
    return true;
  }
  if ((key === 'ArrowUp' || key === 38) && mod == 1) {
    if (this.moveToPrevious($data)) {
      id[1]--;
    }
  } else if ((key === 'ArrowDown' || key === 40) && mod == 1) {
    if (this.moveToNext($data)) {
      id[1]++;
    }
  } else if (key === 'Enter' || key === 13) {
    if (mod == 2) {
      if (id[1] > 0) {
        id[1]--;
      }
    } else if (mod == 0) {
      if (id[1] < length-1) {
        id[1]++;
      }
    } else if (mod == 1) {
      id[1]++;
      id[2] = 0;
      items.splice(id[1], 0, new Item());
    } else {
      return true;
    }
  } else {
    return true;
  }
  event.preventDefault();
  event.stopPropagation();
  elem.blur();
  elem.focus();
  setTimeout(function() {
    elem = document.getElementById(id.join("-"));
    if (elem) {
      elem.focus();
    }
  }, 0);
  return false;
};
ItemsForm.prototype.addItem = function($data) {
  this.list().items.push(new Item());
};
ItemsForm.prototype.removeItem = function($data, event) {
  this.list().items.remove($data._item);
  var id = (""+event.target.id).split(/-/);
  if (id[0] === "item") {
    id[1] = +id[1];
    id[2] = +id[2];
    setTimeout(function() {
      var elem = document.getElementById(id.join("-"));
      console.log(id.join("-"), elem);
      if (elem) {
        elem.focus();
      }
    }, 0);
  }
};
ItemsForm.prototype.moveToPrevious = function($data) {
  var pos = this.items().indexOf($data);
  if (pos <= 0) {
    return false;
  }
  var items = this.list().items;
  var item = items.splice(pos, 1)[0];
  items.splice(pos-1, 0, item);
  return true;
};
ItemsForm.prototype.moveToNext = function($data) {
  var pos = this.items().indexOf($data);
  if (pos < 0 || pos >= this.items().length-1) {
    return false;
  }
  var items = this.list().items;
  var item = items.splice(pos, 1)[0];
  items.splice(pos+1, 0, item);
  return true;
};
ko.components.register("items-form", {
  viewModel: ItemsForm,
  template: { fetch: "html/items-form.html" }
});
ko.components.get("items-form", function(res){});
