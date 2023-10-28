function CarryOverDialog(dialogManager, dataStore) {
  this.component = "carryover-form";
  this.id = "list-dialog";
  this.title = ko.pureComputed(this.title.bind(this));
  this.data = {
    dataStore: dataStore,
    value: ko.observable(null),
    onSave: this.close.bind(this),
  };
  this.handle = null;
  this.dialogManager = dialogManager;
  this.dataStore = dataStore;
  this.onDialogOpen = this.onDialogOpen.bind(this);
  this.onDialogClose = this.onDialogClose.bind(this);
}
CarryOverDialog.prototype.title = function() {
  return this.data.value().date() + "への繰越の作成";
};
CarryOverDialog.prototype.open = function(summary, date) {
  var handle = this.dialogManager.open(this);
  if (!handle) {
    return false;
  }
  this.handle = handle;
  var dataStore = this.dataStore;
  var list = new List();
  list.date(date2str(new Date(next_month(date))));
  var carry = new Item();
  var carry_amount = 0;
  dataStore.kamokus().forEach(function(kamoku) {
    if (kamoku.category_id() == 4 && !carry.kamoku) {
      carry.kamoku_id(kamoku.id());
      carry.kamoku = dataStore.computedKamoku(carry.kamoku_id);
    }
  });
  list.items.push(carry);
  summary.forEach(function(row) {
    var category_id = row.kamoku().category().id();
    if (category_id == 1 || category_id == 3) {
      var item = new Item();
      var amount = row.finalAmount();
      if (amount == 0) return;
      carry_amount += amount;
      item.kamoku_id = row.kamoku_id;
      item.kamoku = row.kamoku;
      if (amount < 0) {
        item.dir(-1);
        item.amount(-amount);
      } else {
        item.dir(1);
        item.amount(amount);
      }
      list.items.push(item);
    }
  });
  if (carry_amount > 0) {
    carry.dir(-1);
    carry.amount(carry_amount);
  } else if (carry_amount < 0) {
    carry.dir(1);
    carry.amount(-carry_amount);
  } else {
    list.items.remove(carry);
  }
  this.data.value(list);
};
CarryOverDialog.prototype.close = function() {
  if (this.handle) {
    this.dialogManager.close(this.handle);
  }
};
CarryOverDialog.prototype.onDialogOpen = function(handle, element) {
  element.querySelector(".dialog-body button").focus();
};
CarryOverDialog.prototype.onDialogClose = function(handle) {
  if (this.handle != handle) {
    return;
  }
  this.data.value(null);
  this.handle = null;
};

function SummaryPage(tabbar, dialogManager, dataStore, date) {
  var self = this;
  self.tabInfo = {label:"月集計",template:"template-summary-page",data:self};
  self.tabInfo.onChange = function(tab, selected, name) {
    if (selected) {
      self.load();
    }
  };
  self.date = date.extend({delay:300});
  self.summary = ko.observableArray();
  self.dateNotfy = date.subscribe(function(newValue) {
    if (tabbar.selected() != 'summary') return;
    if (is_date_str(newValue) || is_month_str(newValue)) {
      self.load();
    }
  });

  [
    "initialAmount", "finalAmount",
    "kasiLeftAmount", "kariLeftAmount",
    "kasiRightAmount", "kariRightAmount",
    "kasiAmount", "kariAmount",
  ].forEach(function(name) {
    self[name] = ko.pureComputed(function() {
      var amount = 0;
      self.summary().forEach(function(item) {
        amount += item[name]()||0;
      });
      return amount;
    });
  });
  self.prevDate = function() {
    var date = self.date();
    if (is_date_str(date)) {
      self.date(prev_date(date));
    } else if (is_month_str(date)) {
      self.date(prev_month(date));
    }
  };
  self.nextDate = function() {
    var date = self.date();
    if (is_date_str(date)) {
      self.date(next_date(date));
    } else if (is_month_str(date)) {
      self.date(next_month(date));
    }
  };
  self.load = function() {
    self.summary([]);
    return Summary.get(self.date()).then(function(results){
      var map = {};
      var array = [];
      results.forEach(function(item) {
        var kamoku_id = item.kamoku_id;
        var summary;
        if (map[kamoku_id]) {
          summary = map[kamoku_id];
        } else {
          summary = map[kamoku_id] = new Summary();
          summary.kamoku_id(kamoku_id);
          summary.kamoku = dataStore.computedKamoku(summary.kamoku_id);
          array.push(summary);
        }
        if (item.is_initial == 1) {
          summary.initialAmount(item.dir*item.amount);
        } else if (item.dir == -1) {
          summary.kasiAmount(item.amount);
          if (summary.kamoku().category().side() == -1) {
            summary.kasiLeftAmount(item.amount);
          } else {
            summary.kasiRightAmount(item.amount);
          }
        } else if (item.dir == 1) {
          summary.kariAmount(item.amount);
          if (summary.kamoku().category().side() == -1) {
            summary.kariLeftAmount(item.amount);
          } else {
            summary.kariRightAmount(item.amount);
          }
        }
      });
      self.summary(array);
      self.summary.sort(compareSummaryItem);
      page.setTitleInfo(self.date());
    });
    if (!item.kamoku) {
      item.kamoku = dataStore.computedKamoku(item.kamoku_id);
    }
  };

  function compareKamokuByCode(a,b) {
    var d = a.category().compareTo(b.category());
    if (d) return d;
    if (a.code() < b.code()) return -1;
    if (a.code() > b.code()) return 1;
    return 0;
  }
  function compareSummaryItem(a,b) {
    return Model.comparator(a.kamoku(), b.kamoku());
  }

  var dialog = new CarryOverDialog(dialogManager, dataStore);
  self.makeCarryOver = function() {
    return dialog.open(self.summary(), self.date());
  };
}

ko.components.register("summary-page", {
  template: { fetch: "html/summary-page.html" }
});
