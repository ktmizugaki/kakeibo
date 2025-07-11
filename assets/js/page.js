var page = (function(_global) {
  /* preload template */
  ko.components.get("calendar", function(res){});
  ko.options.deferUpdates = true;
  var tab = koTabbar({});
  var dialogManager = koDialogManager({});
  var dataStore = new DataStore();
  var date = ko.observable(params.get("date") || month2str(new Date()));
  date.subscribe(function(date) { params.set("date", date); });
  params.query.extend({rateLimit:10}).subscribe(function() { var d = params.get("date"); if (d) date(d); });
  var kamokus = new KamokusPage(tab, dialogManager, dataStore);
  var tmpls = new TmplsPage(tab, dialogManager, dataStore);
  var lists = new ListsPage(tab, dialogManager, dataStore, date);
  var summary = new SummaryPage(tab, dialogManager, dataStore, date);
  var bykamoku = new ByKamokuPage(tab, dialogManager, dataStore, date);
  var data = {
    tab: tab,
    dialogManager: dialogManager,
  };
  var initial = true;
  ko.bindingHandlers.calendarButton = {
    init: function(element, valueAccessor, allBindings) {
      element.addEventListener('click', function() {
        var value = ko.unwrap(valueAccessor());
        value = ko.utils.extend(value);
        CalendarDialog(dialogManager, value);
      });
    }
  };

  return {
    init: function page_init() {
      if (initial) {
        ko.applyBindings(data, document.body);
        data.tab.selected.subscribe(function(tab) {
          if (tab) params.path(tab);
          page.setTitleInfo();
        });
        params.path.subscribe(function(path) { tab.setSelected(path); });
      }
      initial = false;
      data.tab.selected(null);
      Promise.all([kamokus.loadAll(), tmpls.loadAll()]).then(function(res){
        data.tab.addTab(ko.utils.extend(kamokus.tabInfo, {name:"kamokus"}));
        data.tab.addTab(ko.utils.extend(tmpls.tabInfo, {name:"tmpls"}));
        data.tab.addTab(ko.utils.extend(lists.tabInfo, {name:"lists"}));
        data.tab.addTab(ko.utils.extend(summary.tabInfo, {name:"summary"}));
        data.tab.addTab(ko.utils.extend(bykamoku.tabInfo, {name:"bykamoku"}));
        if (!data.tab.setSelected(params.path())) {
          data.tab.selected("kamokus");
        }
      }).catch(function(err){
        alert("データのロードエラーです");
      });
    },
    setTitleInfo: function(info) {
      var tabName = tab.current().label;
      document.title = tabName + (info? "#"+info:"") + ' - ' + '家計簿';
    }
  };
})(this);
