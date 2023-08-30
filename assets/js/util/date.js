function date2str(date) {
  return date.toISOString().substring(0,10);
}
function is_date_str(str) {
  return typeof str === "string" && str.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
}
function month2str(date) {
  return date.toISOString().substring(0,7);
}
function is_month_str(str) {
  return typeof str === "string" && str.match(/^[0-9]{4}-[0-9]{2}$/);
}

function change_date(str, dom) {
  var date = new Date(str);
  if (!isNaN(date.getTime())) {
    if (typeof dom === "number" && dom >= 1 && dom <= 31) {
      date.setDate(dom);
    } else if (dom === 'E') {
      date.setDate(1);
      date.setMonth(date.getMonth()+1);
      date.setDate(0);
    }
    str = date2str(date);
  }
  return str;
}

function prev_date(str) {
  var stringfy = is_date_str(str)? date2str: null;
  if (stringfy) {
    var date = new Date(str);
    if (!isNaN(date.getTime())) {
      date.setDate(date.getDate()-1);
      str = stringfy(date);
    }
  }
  return str;
}
function next_date(str) {
  var stringfy = is_date_str(str)? date2str: null;
  if (stringfy) {
    var date = new Date(str);
    if (!isNaN(date.getTime())) {
      date.setDate(date.getDate()+1);
      str = stringfy(date);
    }
  }
  return str;
}

function prev_month(str) {
  var stringfy = is_date_str(str)? date2str: is_month_str(str)? month2str: null;
  if (stringfy) {
    var date = new Date(str);
    var month = date.getMonth();
    if (!isNaN(date.getTime())) {
      date.setMonth(date.getMonth()-1);
      if (month == date.getMonth()) {
        /* date exceeds number of days of previous month */
        date.setDate(0);
      }
      str = stringfy(date);
    }
  }
  return str;
}
function next_month(str) {
  var stringfy = is_date_str(str)? date2str: is_month_str(str)? month2str: null;
  if (stringfy) {
    var date = new Date(str);
    if (!isNaN(date.getTime())) {
      date.setMonth(date.getMonth()+1);
      str = stringfy(date);
    }
  }
  return str;
}
