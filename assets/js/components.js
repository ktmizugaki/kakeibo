function ItemInputProxy(item, dataStore) {
  this._item = item;
  this.kamoku_id = item.kamoku_id;
  this.dir = item.dir;
  this.desc = item.desc;
  this.amount = item.amount;
  this.errors = item.errors;
  this.error_for = item.error_for.bind(item);
  this.kamoku = dataStore.computedKamoku(item.kamoku_id);
  this.kamoku_code = dataStore.computedKamokuCode(item.kamoku_id);
  this.kamoku_name = ko.computed(function() {
    return this.kamoku() && this.kamoku().name();
  }, this);
  this.kasiInput = ItemInputProxy.computedAmountInput(item, -1);
  this.kariInput = ItemInputProxy.computedAmountInput(item, 1);
}
ItemInputProxy.computedAmountInput = function(item, dir) {
  return ko.pureComputed({
    read: function() {
      var amount = item.amount();
      return item.dir() == dir? amount: null;
    },
    write: function(amount) {
      if (amount == "") {
        if (item.dir() == dir) {
          item.dir(null);
          item.amount(null);
        }
        return;
      }
      var lastDir = item.dir.peek();
      var lastAmount = item.amount.peek() || 0;
      amount = parseInt(amount) || 0;
      if (lastDir == null) {
        item.dir(dir);
        item.amount(amount);
      } else if (lastDir == dir) {
        if (amount != lastAmount) {
          item.amount(amount);
        }
      } else {
        if (lastAmount > amount) {
          item.amount(lastAmount - amount);
        } else if (lastAmount == amount) {
          item.dir(null);
          item.amount(null);
        } else {
          item.dir(dir);
          item.amount(amount - lastAmount);
        }
      }
    },
    owner: item
  }).extend({notify:'always'});
};
