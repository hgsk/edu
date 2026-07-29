var today = new Date();
var _a = [today.getFullYear(), today.getMonth() + 1, today.getDate()], year = _a[0], month = _a[1], day = _a[2];
document.getElementById('date').innerHTML = year + "/" + month + "/" + day;
