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

function CalendarDialog(dialogManager, options) {
  var dialog = {
    template:"template-datepick-dialog",
    id: "date-dialog",
    title: options.title || "日付選択",
    params: {
      date: ko.observable(options.date()||date2str(new Date())),
      mode: options.mode,
    },
    target_date: options.date,
  };
  dialog.data = dialog;
  dialog.apply = function() {
    if (dialog.target_date) {
      dialog.target_date(dialog.params.date());
    }
    if (dialog.handle) {
      dialogManager.close(dialog.handle);
    }
  };
  dialog.cancel = function() {
    if (dialog.handle) {
      dialogManager.close(dialog.handle);
    }
  };
  dialog.onDialogClose = function(handle) {
    if (dialog.handle != handle) {
      return;
    }
    dialog.handle = null;
    dialog.target_date = null;
  };
  var handle = dialogManager.open(dialog);
  if (!handle) {
    return false;
  }
  dialog.handle = handle;
  return dialog;
}
