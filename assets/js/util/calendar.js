function CalendarView(params) {
  var self = this;
  var i, j, pos, row;
  var date = ko.unwrap(params.date);
  var mode = ko.unwrap(params.mode);
  self.mode = ko.observable();
  if (is_month_str(date)) {
    self.mode('month');
  } else if (is_date_str(date)) {
    self.mode('date');
  } else {
    self.mode('date');
    date = date2str(new Date());
  }
  if ((mode == 'month' || mode == 'date') && mode != self.mode()) {
    self.mode(mode);
  }
  if (ko.isObservable(params.date)) {
    self.date = params.date;
  } else {
    self.date = ko.observable(date);
  }
  self.header = ko.computed(function() {
    if (self.mode() == 'month') {
      return null;
    } else {
      return ['日', '月', '火', '水', '木', '金', '土'];
    }
  });
  self.rows = ko.computed(function() {
    if (!self.date()) {
      return;
    }
    var date = new Date(self.date());
    var rows = [];
    if (self.mode() == 'month') {
      var year = date.getFullYear();
      pos = 1;
      for (i = 0; i < 3; i++) {
        row = [];
        for (j = 0; j < 4; j++) {
          row.push({text: pos, value: year+"-"+(pos<10?"0":"")+pos});
          pos++;
        }
        rows.push(row);
      }
    } else {
      var month = month2str(date),
          end = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
      pos = new Date(date.getFullYear(), date.getMonth(), 1),
      pos = 1-pos.getDay();
      for (i = 0; i < 6; i++) {
        row = [];
        for (j = 0; j < 7; j++) {
          if (pos <= 0 || pos > end) {
            row.push({text: "", value: ""});
          } else {
            row.push({text: pos, value: month+"-"+(pos<10?"0":"")+pos});
          }
          pos++;
        }
        rows.push(row);
      }
    }
    return rows;
  });
  self.selected = function(date) {
    if (date) {
      self.date(date.value);
    }
  }
}
CalendarView.prototype.prev = function() {
  if (this.mode() == 'month') {
    var date = new Date(this.date());
    date.setFullYear(date.getFullYear()-1);
    this.date(month2str(date));
  } else {
    this.date(prev_month(this.date()));
  }
};
CalendarView.prototype.next = function() {
  if (this.mode() == 'month') {
    var date = new Date(this.date());
    date.setFullYear(date.getFullYear()+1);
    this.date(month2str(date));
  } else {
    this.date(next_month(this.date()));
  }
};
CalendarView.prototype.now = function() {
  if (this.mode() == 'month') {
    this.date(month2str(new Date()));
  } else {
    this.date(date2str(new Date()));
  }
};
ko.components.register("calendar", {
  viewModel: CalendarView,
  template: { fetch: "html/calendar.html" }
});
